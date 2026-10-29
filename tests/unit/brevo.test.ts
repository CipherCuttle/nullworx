import { describe, expect, it, vi } from "vitest";
import { BrevoNewsletterProvider, NewsletterProviderError } from "@/lib/newsletter/brevo-provider";
import type { SubscribeCommand } from "@/lib/newsletter/types";

const command: SubscribeCommand = {
  email: "person@example.com",
  premiumMarketing: false,
  consent: {
    consentId: "consent-123",
    dropsConsent: true,
    premiumMarketing: false,
    source: "/drops",
    version: "2026-10-28",
    collectedAt: "2026-10-28T12:00:00.000Z",
  },
};

function provider(fetchImpl: typeof fetch, overrides: Partial<ConstructorParameters<typeof BrevoNewsletterProvider>[0]> = {}) {
  return new BrevoNewsletterProvider({
    apiKey: "test-api-key",
    dropsListId: 42,
    doiTemplateId: 7,
    redirectUrl: "https://nulllworx.site/drops/confirmed",
    fetchImpl,
    ...overrides,
  });
}

describe("Brevo adapter", () => {
  it("refuses a redirect URL outside the canonical confirmation route", () => {
    expect(
      () =>
        new BrevoNewsletterProvider({
          apiKey: "test-api-key",
          dropsListId: 42,
          doiTemplateId: 7,
          redirectUrl: "https://evil.example/drops/confirmed",
          fetchImpl: fetch,
        }),
    ).toThrow(NewsletterProviderError);
  });

  it("starts the double opt-in flow for a new contact without premium enrolment", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/contacts/person%40example.com")) return new Response(null, { status: 404 });
      if (url.endsWith("/contacts/doubleOptinConfirmation")) {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        expect(body.email).toBe("person@example.com");
        expect(body.includeListIds).toEqual([42]);
        expect(body.templateId).toBe(7);
        expect(body.redirectionUrl).toBe("https://nulllworx.site/drops/confirmed");
        expect(body.contactPixelTrackingConsent).toBe(false);
        expect(body.attributes).toMatchObject({
          DROPS_CONSENT: true,
          PREMIUM_CONSENT: false,
          PREMIUM_CONSENT_AT: "",
          CONSENT_ID: "consent-123",
          CONSENT_SOURCE: "/drops",
          CONSENT_VERSION: "2026-10-28",
        });
        expect(init?.headers).toMatchObject({ "api-key": "test-api-key" });
        return new Response(JSON.stringify({}), { status: 201 });
      }
      throw new Error(`Unexpected URL ${url}`);
    });
    const result = await provider(fetchMock as unknown as typeof fetch).subscribe(command);
    expect(result.kind).toBe("confirmation_sent");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not start another DOI flow for a suppressed contact", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ emailBlacklisted: true, listIds: [] }), { status: 200 }),
    );
    const result = await provider(fetchMock as unknown as typeof fetch).subscribe(command);
    expect(result.kind).toBe("suppressed");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("updates premium preference for an already confirmed contact without resending DOI", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/contacts/person%40example.com") && (!init || init.method === "GET" || !init.method)) {
        return new Response(JSON.stringify({ emailBlacklisted: false, listIds: [42] }), { status: 200 });
      }
      if (String(input).endsWith("/contacts/person%40example.com") && init?.method === "PUT") {
        const body = JSON.parse(String(init.body)) as { attributes: Record<string, unknown> };
        expect(body.attributes.PREMIUM_CONSENT).toBe(true);
        return new Response(null, { status: 204 });
      }
      throw new Error(`Unexpected URL ${String(input)}`);
    });
    const result = await provider(fetchMock as unknown as typeof fetch).subscribe({
      ...command,
      premiumMarketing: true,
      consent: { ...command.consent, premiumMarketing: true },
    });
    expect(result.kind).toBe("already_confirmed");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps authentication errors without leaking the key", async () => {
    const fetchMock = vi.fn(async () => new Response("unauthorized", { status: 401 }));
    const err = await provider(fetchMock as unknown as typeof fetch)
      .subscribe(command)
      .catch((error: unknown) => error);
    expect(err).toBeInstanceOf(NewsletterProviderError);
    expect((err as NewsletterProviderError).code).toBe("auth");
    expect(String(err)).not.toContain("test-api-key");
  });

  it("treats duplicate requests as an accepted pending state", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/contacts/person%40example.com")) return new Response(null, { status: 404 });
      return new Response(JSON.stringify({ code: "duplicate_request" }), { status: 400 });
    });
    const result = await provider(fetchMock as unknown as typeof fetch).subscribe(command);
    expect(result.kind).toBe("confirmation_sent");
  });

  it("returns a provider error for a 500", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith("/contacts/person%40example.com")) return new Response(null, { status: 404 });
      return new Response("upstream down", { status: 500 });
    });
    const err = await provider(fetchMock as unknown as typeof fetch)
      .subscribe(command)
      .catch((error: unknown) => error);
    expect(err).toBeInstanceOf(NewsletterProviderError);
    expect((err as NewsletterProviderError).code).toBe("provider");
  });
});
