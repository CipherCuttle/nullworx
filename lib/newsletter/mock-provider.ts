import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  ConsentEvidence,
  MockConfirmationResult,
  MockUnsubscribeResult,
  NewsletterProvider,
  ProviderSubscribeOutcome,
  SubscribeCommand,
} from "./types";

type MockStatus = "pending" | "confirmed" | "unsubscribed";

interface MockSubscriber {
  id: string;
  email: string;
  status: MockStatus;
  premiumMarketing: boolean;
  consent: ConsentEvidence;
  createdAt: string;
  confirmedAt?: string;
  unsubscribedAt?: string;
}

interface TokenPayload {
  type: "confirm" | "unsubscribe";
  subject: string;
  expiresAt: number;
}

export interface MockProviderOptions {
  secret: string;
  baseUrl?: string;
  now?: () => number;
  failNextWith?: Error;
  confirmationTtlSeconds?: number;
}

export class MockNewsletterProvider implements NewsletterProvider {
  readonly mode = "mock" as const;
  private readonly subscribers = new Map<string, MockSubscriber>();
  private readonly now: () => number;
  private readonly confirmationTtlSeconds: number;
  private forcedFailure: Error | null;

  constructor(private readonly options: MockProviderOptions) {
    if (!options.secret || options.secret.length < 16) {
      throw new Error("A mock newsletter secret of at least 16 characters is required.");
    }
    this.now = options.now ?? Date.now;
    this.confirmationTtlSeconds = options.confirmationTtlSeconds ?? 60 * 60 * 48;
    this.forcedFailure = options.failNextWith ?? null;
  }

  async subscribe(command: SubscribeCommand): Promise<ProviderSubscribeOutcome> {
    if (this.forcedFailure) {
      const failure = this.forcedFailure;
      this.forcedFailure = null;
      throw failure;
    }

    const email = command.email.trim().toLowerCase();
    const existing = this.subscribers.get(email);

    if (existing?.status === "unsubscribed") {
      return { kind: "suppressed" };
    }
    if (existing?.status === "confirmed") {
      // A preference change is allowed, but no second confirmation email is sent.
      if (command.premiumMarketing !== existing.premiumMarketing) {
        existing.premiumMarketing = command.premiumMarketing;
        existing.consent = { ...command.consent, dropsConsent: true };
      }
      return { kind: "already_confirmed" };
    }
    if (existing?.status === "pending") {
      return {
        kind: "mock_pending",
        confirmationUrl: this.confirmationUrl(email),
      };
    }

    const subscriber: MockSubscriber = {
      id: randomUUID(),
      email,
      status: "pending",
      premiumMarketing: command.premiumMarketing,
      consent: { ...command.consent, dropsConsent: true },
      createdAt: new Date(this.now()).toISOString(),
    };
    this.subscribers.set(email, subscriber);
    return {
      kind: "mock_pending",
      confirmationUrl: this.confirmationUrl(email),
    };
  }

  async confirm(token: string): Promise<MockConfirmationResult> {
    const payload = this.readToken(token, "confirm");
    if (!payload) return { email: "", confirmed: false, reason: "invalid" };
    const subscriber = [...this.subscribers.values()].find((entry) => entry.id === payload.subject);
    if (!subscriber) return { email: "", confirmed: false, reason: "unknown" };
    if (subscriber.status === "unsubscribed") {
      return { email: subscriber.email, confirmed: false, reason: "invalid" };
    }
    if (subscriber.status === "confirmed") {
      return { email: subscriber.email, confirmed: true };
    }
    subscriber.status = "confirmed";
    subscriber.confirmedAt = new Date(this.now()).toISOString();
    return { email: subscriber.email, confirmed: true };
  }

  async unsubscribe(token: string): Promise<MockUnsubscribeResult> {
    const payload = this.readToken(token, "unsubscribe");
    if (!payload) return { email: "", unsubscribed: false, reason: "invalid" };
    const subscriber = [...this.subscribers.values()].find((entry) => entry.id === payload.subject);
    if (!subscriber) return { email: "", unsubscribed: false, reason: "unknown" };
    if (subscriber.status === "unsubscribed") {
      return { email: subscriber.email, unsubscribed: true };
    }
    subscriber.status = "unsubscribed";
    subscriber.premiumMarketing = false;
    subscriber.unsubscribedAt = new Date(this.now()).toISOString();
    return { email: subscriber.email, unsubscribed: true };
  }

  async isSuppressed(email: string): Promise<boolean> {
    return this.subscribers.get(email.trim().toLowerCase())?.status === "unsubscribed";
  }

  /** Test-only introspection. No route exposes this. */
  inspect(email: string): Readonly<MockSubscriber> | undefined {
    return this.subscribers.get(email.trim().toLowerCase());
  }

  createUnsubscribeToken(email: string): string | null {
    const subscriber = this.subscribers.get(email.trim().toLowerCase());
    if (!subscriber) return null;
    return this.signToken({ type: "unsubscribe", subject: subscriber.id, expiresAt: this.now() + 1000 * 60 * 60 * 24 * 365 });
  }

  private confirmationUrl(email: string): string {
    const subscriber = this.subscribers.get(email);
    if (!subscriber) throw new Error("Mock subscriber was not stored before creating a confirmation URL.");
    const token = this.signToken({
      type: "confirm",
      subject: subscriber.id,
      expiresAt: this.now() + this.confirmationTtlSeconds * 1000,
    });
    const path = `/api/newsletter/confirm?token=${encodeURIComponent(token)}`;
    return this.options.baseUrl ? new URL(path, this.options.baseUrl).toString() : path;
  }

  private signToken(payload: TokenPayload): string {
    const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    const signature = createHmac("sha256", this.options.secret).update(encoded).digest("base64url");
    return `${encoded}.${signature}`;
  }

  private readToken(token: string, expectedType: TokenPayload["type"]): TokenPayload | null {
    if (!token || token.length > 2048) return null;
    const [encoded, signature] = token.split(".");
    if (!encoded || !signature) return null;
    const expected = createHmac("sha256", this.options.secret).update(encoded).digest();
    let received: Buffer;
    try {
      received = Buffer.from(signature, "base64url");
    } catch {
      return null;
    }
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
    try {
      const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as TokenPayload;
      if (payload.type !== expectedType) return null;
      if (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= this.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }
}
