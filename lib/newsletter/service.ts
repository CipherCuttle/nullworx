import { createHash, createHmac, randomUUID } from "node:crypto";
import type { InMemoryRateLimiter } from "./rate-limit";
import type {
  ConsentEvidence,
  NewsletterProvider,
  ProviderSubscribeOutcome,
} from "./types";
import { CONSENT_VERSION, GENERIC_SUBSCRIBE_MESSAGE, NEWSLETTER_SOURCE } from "./types";
import { normaliseEmail } from "./validation";

export type ServiceOutcome =
  | { kind: "accepted"; requestId: string; provider: ProviderSubscribeOutcome; previewConfirmationUrl?: string }
  | { kind: "rate_limited"; requestId: string; retryAfterSeconds: number }
  | { kind: "provider_error"; requestId: string; cause: unknown }
  | { kind: "idempotency_conflict"; requestId: string };

interface CachedResult {
  requestHash: string;
  expiresAt: number;
  outcome: ServiceOutcome;
}

export interface NewsletterServiceOptions {
  provider: NewsletterProvider;
  rateLimiter: InMemoryRateLimiter;
  ipSecret: string;
  now?: () => number;
  idempotencyWindowMs?: number;
  previewConfirmationUrl?: boolean;
}

export interface SubscribeContext {
  ip: string;
  idempotencyKey: string;
  sourcePath?: string;
}

export class NewsletterService {
  private readonly cache = new Map<string, CachedResult>();
  private readonly now: () => number;
  private readonly idempotencyWindowMs: number;
  private lastPrune = 0;

  constructor(private readonly options: NewsletterServiceOptions) {
    this.now = options.now ?? Date.now;
    this.idempotencyWindowMs = options.idempotencyWindowMs ?? 15 * 60 * 1000;
  }

  async subscribe(
    request: { email: string; premiumMarketing: boolean },
    context: SubscribeContext,
  ): Promise<ServiceOutcome> {
    const email = normaliseEmail(request.email);
    const requestHash = createHash("sha256")
      .update(JSON.stringify({ email, premiumMarketing: request.premiumMarketing }))
      .digest("hex");
    const idempotencyKey = context.idempotencyKey.trim().slice(0, 200);
    const cacheKey = createHash("sha256").update(idempotencyKey).digest("hex");

    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > this.now() && cached.requestHash === requestHash) {
      return cached.outcome;
    }
    if (cached && cached.expiresAt > this.now() && cached.requestHash !== requestHash) {
      return { kind: "idempotency_conflict", requestId: randomUUID() };
    }

    const ipHash = createHmac("sha256", this.options.ipSecret)
      .update(context.ip || "unknown")
      .digest("hex");
    const emailHash = createHash("sha256").update(email).digest("hex");

    const ipLimit = this.options.rateLimiter.consume(`newsletter:ip:${ipHash}`, 8, 10 * 60 * 1000);
    const emailLimit = this.options.rateLimiter.consume(`newsletter:email:${emailHash}`, 3, 10 * 60 * 1000);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      const retryAfterSeconds = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds, 1);
      const outcome: ServiceOutcome = { kind: "rate_limited", requestId: randomUUID(), retryAfterSeconds };
      this.store(cacheKey, requestHash, outcome);
      return outcome;
    }

    const consent: ConsentEvidence = {
      consentId: randomUUID(),
      dropsConsent: true,
      premiumMarketing: request.premiumMarketing,
      source: context.sourcePath ?? NEWSLETTER_SOURCE,
      version: CONSENT_VERSION,
      collectedAt: new Date(this.now()).toISOString(),
    };

    const requestId = randomUUID();
    try {
      const provider = await this.options.provider.subscribe({
        email,
        premiumMarketing: request.premiumMarketing,
        consent,
      });
      const outcome: ServiceOutcome = {
        kind: "accepted",
        requestId,
        provider,
        previewConfirmationUrl:
          this.options.previewConfirmationUrl && provider.kind === "mock_pending"
            ? provider.confirmationUrl
            : undefined,
      };
      this.store(cacheKey, requestHash, outcome);
      return outcome;
    } catch (cause) {
      return { kind: "provider_error", requestId, cause };
    }
  }

  get genericMessage(): string {
    return GENERIC_SUBSCRIBE_MESSAGE;
  }

  private store(key: string, requestHash: string, outcome: ServiceOutcome): void {
    this.prune();
    this.cache.set(key, { requestHash, expiresAt: this.now() + this.idempotencyWindowMs, outcome });
  }

  private prune(): void {
    const now = this.now();
    if (now - this.lastPrune < 60_000) return;
    for (const [key, result] of this.cache) {
      if (result.expiresAt <= now) this.cache.delete(key);
    }
    this.lastPrune = now;
  }
}
