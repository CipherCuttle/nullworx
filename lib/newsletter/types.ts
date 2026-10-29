export const CONSENT_VERSION = "2026-10-28";
export const NEWSLETTER_SOURCE = "/drops";

export type NewsletterMode = "disabled" | "mock" | "brevo";

export interface ConsentEvidence {
  consentId: string;
  dropsConsent: true;
  premiumMarketing: boolean;
  source: string;
  version: string;
  collectedAt: string;
}

export interface SubscribeCommand {
  email: string;
  premiumMarketing: boolean;
  consent: ConsentEvidence;
}

export type ProviderSubscribeOutcome =
  | { kind: "confirmation_sent" }
  | { kind: "already_pending" }
  | { kind: "already_confirmed" }
  | { kind: "suppressed" }
  | { kind: "mock_pending"; confirmationUrl: string };

export interface NewsletterProvider {
  readonly mode: Exclude<NewsletterMode, "disabled">;
  subscribe(command: SubscribeCommand): Promise<ProviderSubscribeOutcome>;
  isSuppressed?(email: string): Promise<boolean>;
}

export interface MockConfirmationResult {
  email: string;
  confirmed: boolean;
  reason?: "invalid" | "expired" | "unknown";
}

export interface MockUnsubscribeResult {
  email: string;
  unsubscribed: boolean;
  reason?: "invalid" | "expired" | "unknown";
}

export interface NewsletterApiSuccess {
  ok: true;
  message: string;
  requestId: string;
  preview?: {
    confirmationUrl: string;
    note: string;
  };
}

export interface NewsletterApiError {
  ok: false;
  code: "invalid_input" | "unavailable" | "rate_limited" | "provider_error" | "method_not_allowed";
  message: string;
  retryAfterSeconds?: number;
}

export const GENERIC_SUBSCRIBE_MESSAGE =
  "If this address can be subscribed, a confirmation email is on its way. Check your inbox and confirm the subscription.";
