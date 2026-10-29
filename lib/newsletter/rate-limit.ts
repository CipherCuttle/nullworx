export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Small fixed-window limiter for V0.1. This is intentionally in-memory and is
 * not sufficient across multiple server instances. The deployment note calls
 * for a durable Redis-backed limiter before real subscriber traffic.
 */
export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private lastPrune = 0;

  constructor(private readonly now: () => number = Date.now) {}

  consume(key: string, limit: number, windowMs: number): RateLimitDecision {
    const now = this.now();
    this.prune(now);
    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, retryAfterSeconds: 0, remaining: Math.max(0, limit - 1) };
    }

    if (current.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
        remaining: 0,
      };
    }

    current.count += 1;
    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(0, limit - current.count),
    };
  }

  private prune(now: number): void {
    if (now - this.lastPrune < 60_000) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
    this.lastPrune = now;
  }
}
