import { randomUUID } from "node:crypto";
import { siteOrigin } from "@/lib/site";
import { normaliseConfirmRedirectUrl } from "./redirect";
import type {
  NewsletterProvider,
  ProviderSubscribeOutcome,
  SubscribeCommand,
} from "./types";

interface BrevoContact {
  email?: string;
  emailBlacklisted?: boolean;
  listIds?: number[];
  listUnsubscribed?: number[];
}

export interface BrevoConfig {
  apiKey: string;
  dropsListId: number;
  doiTemplateId: number;
  redirectUrl: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class NewsletterProviderError extends Error {
  constructor(
    message: string,
    readonly code: "auth" | "rate_limited" | "provider" | "configuration",
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "NewsletterProviderError";
  }
}

/**
 * Narrow Brevo adapter. Brevo owns the double opt-in email, the confirmation
 * record and the hosted unsubscribe flow. This adapter only creates/updates
 * contacts and starts the DOI flow. It does not send campaigns.
 */
export class BrevoNewsletterProvider implements NewsletterProvider {
  readonly mode = "brevo" as const;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly listId: number;
  private readonly redirectUrl: string;

  constructor(private readonly config: BrevoConfig) {
    if (!config.apiKey || !config.dropsListId || !config.doiTemplateId) {
      throw new NewsletterProviderError("Brevo configuration is incomplete.", "configuration");
    }
    const redirectUrl = normaliseConfirmRedirectUrl(config.redirectUrl, siteOrigin);
    if (!redirectUrl) {
      throw new NewsletterProviderError(
        "Brevo redirectUrl must be the canonical /drops/confirmed URL.",
        "configuration",
      );
    }
    this.baseUrl = (config.apiBaseUrl ?? "https://api.brevo.com/v3").replace(/\/$/, "");
    this.fetchImpl = config.fetchImpl ?? fetch;
    this.timeoutMs = config.timeoutMs ?? 8_000;
    this.listId = config.dropsListId;
    this.redirectUrl = redirectUrl;
  }

  async subscribe(command: SubscribeCommand): Promise<ProviderSubscribeOutcome> {
    const email = command.email.trim().toLowerCase();
    const existing = await this.getContact(email);

    if (existing) {
      if (existing.emailBlacklisted || existing.listUnsubscribed?.includes(this.listId)) {
        return { kind: "suppressed" };
      }
      if (existing.listIds?.includes(this.listId)) {
        await this.updatePremiumPreference(email, command);
        return { kind: "already_confirmed" };
      }
    }

    await this.startDoubleOptIn(email, command);
    return { kind: "confirmation_sent" };
  }

  async isSuppressed(email: string): Promise<boolean> {
    const existing = await this.getContact(email.trim().toLowerCase());
    return Boolean(existing?.emailBlacklisted || existing?.listUnsubscribed?.includes(this.listId));
  }

  async unsubscribe(email: string): Promise<void> {
    // This method is for an owner-run administrative job. The public unsubscribe
    // path remains Brevo's hosted one-click unsubscribe. It removes the contact
    // from the Drops list without blacklisting every Brevo message.
    const response = await this.request(`/contacts/${encodeURIComponent(email)}`, {
      method: "PUT",
      body: JSON.stringify({
        unlinkListIds: [this.listId],
        attributes: {
          DROPS_CONSENT: false,
          PREMIUM_CONSENT: false,
          UNSUBSCRIBED_AT: new Date().toISOString(),
        },
      }),
    });
    if (!response.ok && response.status !== 404) {
      throw this.mapHttpError(response.status, "Could not update the contact.");
    }
  }

  private async getContact(email: string): Promise<BrevoContact | null> {
    const response = await this.request(`/contacts/${encodeURIComponent(email)}`, { method: "GET" });
    if (response.status === 404) return null;
    if (!response.ok) throw this.mapHttpError(response.status, "Could not look up the contact.");
    return (await response.json()) as BrevoContact;
  }

  private async startDoubleOptIn(email: string, command: SubscribeCommand): Promise<void> {
    const premiumConsentAt = command.premiumMarketing ? command.consent.collectedAt : "";
    const response = await this.request("/contacts/doubleOptinConfirmation", {
      method: "POST",
      body: JSON.stringify({
        email,
        includeListIds: [this.listId],
        redirectionUrl: this.redirectUrl,
        templateId: this.config.doiTemplateId,
        contactPixelTrackingConsent: false,
        attributes: {
          DROPS_CONSENT: true,
          DROPS_CONSENT_AT: command.consent.collectedAt,
          CONSENT_VERSION: command.consent.version,
          CONSENT_SOURCE: command.consent.source,
          CONSENT_ID: command.consent.consentId || randomUUID(),
          PREMIUM_CONSENT: command.premiumMarketing,
          PREMIUM_CONSENT_AT: premiumConsentAt,
        },
      }),
    });

    if (response.ok) return;

    if (response.status === 400) {
      const body = (await safeJson(response)) as { code?: string } | null;
      if (body?.code === "duplicate_request" || body?.code === "duplicate_parameter") {
        return;
      }
    }
    throw this.mapHttpError(response.status, "Brevo did not accept the double opt-in request.");
  }

  private async updatePremiumPreference(email: string, command: SubscribeCommand): Promise<void> {
    const response = await this.request(`/contacts/${encodeURIComponent(email)}`, {
      method: "PUT",
      body: JSON.stringify({
        attributes: {
          DROPS_CONSENT: true,
          PREMIUM_CONSENT: command.premiumMarketing,
          PREMIUM_CONSENT_AT: command.premiumMarketing ? command.consent.collectedAt : "",
          CONSENT_ID: command.consent.consentId,
          CONSENT_VERSION: command.consent.version,
          CONSENT_SOURCE: command.consent.source,
        },
      }),
    });
    if (!response.ok) {
      throw this.mapHttpError(response.status, "Could not update the contact preference.");
    }
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          "api-key": this.config.apiKey,
          "content-type": "application/json",
          accept: "application/json",
          ...(init.headers ?? {}),
        },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new NewsletterProviderError("The email provider could not be reached.", "provider", { cause: error });
    }
    return response;
  }

  private mapHttpError(status: number, message: string): NewsletterProviderError {
    if (status === 401 || status === 403) return new NewsletterProviderError(message, "auth");
    if (status === 429) return new NewsletterProviderError(message, "rate_limited");
    return new NewsletterProviderError(`${message} (HTTP ${status})`, "provider");
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
