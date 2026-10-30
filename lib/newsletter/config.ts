import "server-only";
import { randomBytes } from "node:crypto";
import { siteOrigin } from "@/lib/site";
import { BrevoNewsletterProvider } from "./brevo-provider";
import { MockNewsletterProvider } from "./mock-provider";
import { InMemoryRateLimiter } from "./rate-limit";
import { normaliseConfirmRedirectUrl } from "./redirect";
import { NewsletterService } from "./service";
import type { NewsletterMode } from "./types";

export interface NewsletterRuntime {
  mode: NewsletterMode;
  service: NewsletterService | null;
  mockProvider: MockNewsletterProvider | null;
  reason?: string;
}

function parseMode(value: string | undefined): NewsletterMode {
  const mode = (value ?? "disabled").trim().toLowerCase();
  return mode === "mock" || mode === "brevo" ? mode : "disabled";
}

function positiveInteger(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildRuntime(): NewsletterRuntime {
  const mode = parseMode(process.env.NEWSLETTER_PROVIDER);

  if (mode === "disabled") {
    return { mode, service: null, mockProvider: null, reason: "Newsletter provider is not configured." };
  }

  const configuredIpSecret = process.env.NEWSLETTER_IP_HASH_SECRET?.trim();
  const ipSecret = configuredIpSecret || randomBytes(32).toString("hex");

  if (mode === "mock") {
    if (process.env.NODE_ENV === "production" && process.env.NEWSLETTER_ALLOW_MOCK !== "1") {
      return {
        mode: "disabled",
        service: null,
        mockProvider: null,
        reason: "Mock newsletter mode is disabled in production unless NEWSLETTER_ALLOW_MOCK=1.",
      };
    }
    const secret =
      process.env.NEWSLETTER_MOCK_SECRET?.trim() ||
      (process.env.NODE_ENV === "production" ? "" : "nullworx-local-mock-secret-change-me");
    if (!secret) {
      return {
        mode: "disabled",
        service: null,
        mockProvider: null,
        reason: "NEWSLETTER_MOCK_SECRET is required for mock mode in production.",
      };
    }
    const mockProvider = new MockNewsletterProvider({ secret });
    return {
      mode,
      mockProvider,
      service: new NewsletterService({
        provider: mockProvider,
        rateLimiter: new InMemoryRateLimiter(),
        ipSecret,
        previewConfirmationUrl: true,
      }),
    };
  }

  const apiKey = process.env.BREVO_API_KEY?.trim();
  const dropsListId = positiveInteger(process.env.BREVO_DROPS_LIST_ID);
  const doiTemplateId = positiveInteger(process.env.BREVO_DOI_TEMPLATE_ID);
  const rawRedirectUrl = process.env.NEWSLETTER_CONFIRM_REDIRECT_URL?.trim();
  const redirectUrl = normaliseConfirmRedirectUrl(rawRedirectUrl, siteOrigin);

  if (process.env.NODE_ENV === "production" && (!configuredIpSecret || configuredIpSecret.length < 32)) {
    return {
      mode: "disabled",
      service: null,
      mockProvider: null,
      reason:
        "NEWSLETTER_IP_HASH_SECRET (32+ characters) is required for real newsletter collection; collection is disabled.",
    };
  }

  if (rawRedirectUrl && !redirectUrl) {
    return {
      mode: "disabled",
      service: null,
      mockProvider: null,
      reason:
        "NEWSLETTER_CONFIRM_REDIRECT_URL must be the canonical /drops/confirmed HTTPS URL; newsletter collection is disabled.",
    };
  }

  if (!apiKey || !dropsListId || !doiTemplateId || !redirectUrl) {
    return {
      mode: "disabled",
      service: null,
      mockProvider: null,
      reason: "Brevo configuration is incomplete; newsletter collection is disabled.",
    };
  }

  try {
    const provider = new BrevoNewsletterProvider({
      apiKey,
      dropsListId,
      doiTemplateId,
      redirectUrl,
    });
    return {
      mode,
      mockProvider: null,
      service: new NewsletterService({
        provider,
        rateLimiter: new InMemoryRateLimiter(),
        ipSecret,
      }),
    };
  } catch (error) {
    return {
      mode: "disabled",
      service: null,
      mockProvider: null,
      reason: error instanceof Error ? error.message : "Newsletter configuration failed.",
    };
  }
}

const globalForNewsletter = globalThis as typeof globalThis & {
  __nullworxNewsletter?: NewsletterRuntime;
};

export function getNewsletterRuntime(): NewsletterRuntime {
  if (!globalForNewsletter.__nullworxNewsletter) {
    globalForNewsletter.__nullworxNewsletter = buildRuntime();
  }
  return globalForNewsletter.__nullworxNewsletter;
}
