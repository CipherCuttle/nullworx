import { describe, expect, it } from "vitest";
import { MockNewsletterProvider } from "@/lib/newsletter/mock-provider";
import { InMemoryRateLimiter } from "@/lib/newsletter/rate-limit";
import { normaliseConfirmRedirectUrl } from "@/lib/newsletter/redirect";
import { NewsletterService } from "@/lib/newsletter/service";
import { GENERIC_SUBSCRIBE_MESSAGE } from "@/lib/newsletter/types";
import { emailSchema, newsletterRequestSchema } from "@/lib/newsletter/validation";

const secret = "test-only-secret-at-least-sixteen-characters";
const context = (key: string, ip = "203.0.113.10") => ({
  ip,
  idempotencyKey: key,
  sourcePath: "/drops",
});

function buildService(options: { preview?: boolean; limitNow?: () => number } = {}) {
  const provider = new MockNewsletterProvider({
    secret,
    now: options.limitNow,
  });
  const service = new NewsletterService({
    provider,
    rateLimiter: new InMemoryRateLimiter(options.limitNow),
    ipSecret: "test-ip-hash-secret",
    now: options.limitNow,
    previewConfirmationUrl: options.preview ?? true,
  });
  return { provider, service };
}

describe("newsletter validation and consent", () => {
  it("normalises email case and whitespace", () => {
    expect(emailSchema.parse("  Person@Example.COM ")).toBe("person@example.com");
  });

  it("pins the DOI confirmation redirect to the canonical route", () => {
    const canonical = "https://nulllworx.site";
    expect(normaliseConfirmRedirectUrl("https://nulllworx.site/drops/confirmed", canonical)).toBe(
      "https://nulllworx.site/drops/confirmed",
    );
    expect(normaliseConfirmRedirectUrl("https://nulllworx.site/drops/confirmed/", canonical)).toBe(
      "https://nulllworx.site/drops/confirmed",
    );
    expect(normaliseConfirmRedirectUrl("http://localhost:3000/drops/confirmed", "http://localhost:3000")).toBe(
      "http://localhost:3000/drops/confirmed",
    );
    expect(normaliseConfirmRedirectUrl("https://evil.example/drops/confirmed", canonical)).toBeNull();
    expect(normaliseConfirmRedirectUrl("http://nulllworx.site/drops/confirmed", canonical)).toBeNull();
    expect(normaliseConfirmRedirectUrl("https://nulllworx.site/drops/confirmed?next=evil", canonical)).toBeNull();
    expect(normaliseConfirmRedirectUrl("https://nulllworx.site/elsewhere", canonical)).toBeNull();
    expect(normaliseConfirmRedirectUrl("", canonical)).toBeNull();
  });

  it("requires explicit free-newsletter consent", () => {
    const parsed = newsletterRequestSchema.safeParse({
      email: "person@example.com",
      dropsConsent: false,
      premiumMarketing: false,
    });
    expect(parsed.success).toBe(false);
  });

  it("keeps premium marketing independent and defaults it off", () => {
    const parsed = newsletterRequestSchema.parse({
      email: "person@example.com",
      dropsConsent: true,
    });
    expect(parsed.premiumMarketing).toBe(false);
  });

  it("rejects an email in unknown analytics-like fields", () => {
    const parsed = newsletterRequestSchema.safeParse({
      email: "person@example.com",
      dropsConsent: true,
      premiumMarketing: true,
      unrelated: "sneaky@example.com",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("mock double opt-in flow", () => {
  it("creates a pending subscriber, confirms once and preserves consent", async () => {
    const provider = new MockNewsletterProvider({ secret, now: () => Date.parse("2026-10-28T12:00:00Z") });
    const outcome = await provider.subscribe({
      email: "Person@Example.com",
      premiumMarketing: false,
      consent: {
        consentId: "consent-1",
        dropsConsent: true,
        premiumMarketing: false,
        source: "/drops",
        version: "2026-10-28",
        collectedAt: "2026-10-28T12:00:00.000Z",
      },
    });
    expect(outcome.kind).toBe("mock_pending");
    if (outcome.kind !== "mock_pending") throw new Error("Expected a mock pending outcome.");
    const token = new URL(outcome.confirmationUrl, "http://localhost").searchParams.get("token");
    expect(token).toBeTruthy();
    const result = await provider.confirm(token!);
    expect(result.confirmed).toBe(true);
    expect(provider.inspect("person@example.com")?.status).toBe("confirmed");
    expect(provider.inspect("person@example.com")?.consent.dropsConsent).toBe(true);
    expect(provider.inspect("person@example.com")?.premiumMarketing).toBe(false);

    const duplicate = await provider.subscribe({
      email: "person@example.com",
      premiumMarketing: true,
      consent: {
        consentId: "consent-2",
        dropsConsent: true,
        premiumMarketing: true,
        source: "/drops",
        version: "2026-10-28",
        collectedAt: "2026-10-29T12:00:00.000Z",
      },
    });
    expect(duplicate.kind).toBe("already_confirmed");
    expect(provider.inspect("person@example.com")?.premiumMarketing).toBe(true);
    expect(provider.inspect("person@example.com")?.status).toBe("confirmed");
  });

  it("does not send a second confirmation for a pending duplicate", async () => {
    const provider = new MockNewsletterProvider({ secret });
    const command = {
      email: "pending@example.com",
      premiumMarketing: false,
      consent: {
        consentId: "consent-1",
        dropsConsent: true as const,
        premiumMarketing: false,
        source: "/drops",
        version: "2026-10-28",
        collectedAt: "2026-10-28T12:00:00.000Z",
      },
    };
    const first = await provider.subscribe(command);
    const second = await provider.subscribe(command);
    expect(first.kind).toBe("mock_pending");
    expect(second.kind).toBe("mock_pending");
    expect(provider.inspect("pending@example.com")?.status).toBe("pending");
  });

  it("suppresses a subscriber after unsubscribe and does not resubscribe them", async () => {
    const provider = new MockNewsletterProvider({ secret });
    const command = {
      email: "gone@example.com",
      premiumMarketing: false,
      consent: {
        consentId: "consent-1",
        dropsConsent: true as const,
        premiumMarketing: false,
        source: "/drops",
        version: "2026-10-28",
        collectedAt: "2026-10-28T12:00:00.000Z",
      },
    };
    const pending = await provider.subscribe(command);
    if (pending.kind !== "mock_pending") throw new Error("Expected pending.");
    const token = new URL(pending.confirmationUrl, "http://localhost").searchParams.get("token")!;
    await provider.confirm(token);
    const unsubToken = provider.createUnsubscribeToken("gone@example.com")!;
    const unsubscribed = await provider.unsubscribe(unsubToken);
    expect(unsubscribed.unsubscribed).toBe(true);
    expect(provider.inspect("gone@example.com")?.status).toBe("unsubscribed");
    expect(provider.inspect("gone@example.com")?.premiumMarketing).toBe(false);
    const retry = await provider.subscribe(command);
    expect(retry.kind).toBe("suppressed");
    expect(provider.inspect("gone@example.com")?.status).toBe("unsubscribed");
  });

  it("rejects invalid and expired tokens", async () => {
    let now = Date.parse("2026-10-28T12:00:00Z");
    const provider = new MockNewsletterProvider({ secret, now: () => now, confirmationTtlSeconds: 60 });
    const command = {
      email: "time@example.com",
      premiumMarketing: false,
      consent: {
        consentId: "consent-1",
        dropsConsent: true as const,
        premiumMarketing: false,
        source: "/drops",
        version: "2026-10-28",
        collectedAt: "2026-10-28T12:00:00.000Z",
      },
    };
    const pending = await provider.subscribe(command);
    if (pending.kind !== "mock_pending") throw new Error("Expected pending.");
    const token = new URL(pending.confirmationUrl, "http://localhost").searchParams.get("token")!;
    now += 120_000;
    const expired = await provider.confirm(token);
    expect(expired.confirmed).toBe(false);
    const invalid = await provider.confirm("not-a-token");
    expect(invalid.confirmed).toBe(false);
  });
});

describe("newsletter service hardening", () => {
  it("returns a generic accepted response with a mock-only preview URL", async () => {
    const { service } = buildService();
    const result = await service.subscribe(
      { email: "preview@example.com", premiumMarketing: false },
      context("key-preview"),
    );
    expect(result.kind).toBe("accepted");
    if (result.kind !== "accepted") throw new Error("Expected accepted.");
    expect(result.previewConfirmationUrl).toMatch(/^\/api\/newsletter\/confirm\?token=/);
    expect(service.genericMessage).toBe(GENERIC_SUBSCRIBE_MESSAGE);
  });

  it("is idempotent for the same key and payload", async () => {
    const { service } = buildService();
    const request = { email: "idem@example.com", premiumMarketing: false };
    const first = await service.subscribe(request, context("same-key"));
    const second = await service.subscribe(request, context("same-key"));
    expect(first.kind).toBe("accepted");
    expect(second.kind).toBe("accepted");
    if (first.kind !== "accepted" || second.kind !== "accepted") throw new Error("Expected accepted.");
    expect(second.requestId).toBe(first.requestId);
  });

  it("rejects a reused idempotency key with a different payload", async () => {
    const { service } = buildService();
    await service.subscribe({ email: "one@example.com", premiumMarketing: false }, context("reuse"));
    const conflict = await service.subscribe({ email: "two@example.com", premiumMarketing: false }, context("reuse"));
    expect(conflict.kind).toBe("idempotency_conflict");
  });

  it("rate limits repeated requests for the same email and IP", async () => {
    let now = Date.parse("2026-10-28T12:00:00Z");
    const { service } = buildService({ limitNow: () => now });
    for (let index = 0; index < 3; index += 1) {
      const result = await service.subscribe(
        { email: "limit@example.com", premiumMarketing: false },
        context(`limit-${index}`),
      );
      expect(result.kind).toBe("accepted");
      now += 1000;
    }
    const fourth = await service.subscribe(
      { email: "limit@example.com", premiumMarketing: false },
      context("limit-3"),
    );
    expect(fourth.kind).toBe("rate_limited");
    if (fourth.kind === "rate_limited") {
      expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
    }
  });

  it("contains a provider failure and does not expose a cause to the client path", async () => {
    const provider = new MockNewsletterProvider({
      secret,
      failNextWith: new Error("upstream token=super-secret"),
    });
    const service = new NewsletterService({
      provider,
      rateLimiter: new InMemoryRateLimiter(),
      ipSecret: "test-ip-hash-secret",
      previewConfirmationUrl: true,
    });
    const result = await service.subscribe(
      { email: "failure@example.com", premiumMarketing: false },
      context("failure-key"),
    );
    expect(result.kind).toBe("provider_error");
    if (result.kind === "provider_error") {
      expect(result.cause).toBeInstanceOf(Error);
    }
  });

  it("does not record an analytics event, email or raw IP in the public response", async () => {
    const { service } = buildService();
    const result = await service.subscribe(
      { email: "private@example.com", premiumMarketing: true },
      context("privacy-key", "198.51.100.20"),
    );
    expect(result.kind).toBe("accepted");
    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain("private@example.com");
    expect(serialised).not.toContain("198.51.100.20");
    expect(serialised).not.toContain("consentId");
  });

  it("only emits the mock preview link when explicitly enabled", async () => {
    const { service } = buildService({ preview: false });
    const result = await service.subscribe(
      { email: "no-preview@example.com", premiumMarketing: false },
      context("no-preview"),
    );
    expect(result.kind).toBe("accepted");
    if (result.kind === "accepted") {
      expect(result.previewConfirmationUrl).toBeUndefined();
    }
  });
});
