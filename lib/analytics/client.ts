"use client";

import type { AnalyticsEventName } from "./events";

interface TrackOptions {
  effectSlug?: string;
  location?: "home" | "effects" | "effect-preview" | "drops" | "footer" | "about";
}

/**
 * Cookieless, identity-free event sender. No email, IP, user agent, referrer or
 * persistent identifier is sent. The server only accepts the allowlisted fields
 * in lib/analytics/events.ts.
 */
export function trackClientEvent(event: AnalyticsEventName, options: TrackOptions = {}): void {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_ANALYTICS === "off") return;

  const payload = {
    event,
    path: window.location.pathname,
    ...(options.effectSlug ? { effectSlug: options.effectSlug } : {}),
    ...(options.location ? { location: options.location } : {}),
  };

  void fetch("/api/events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
    credentials: "omit",
    cache: "no-store",
  }).catch(() => {
    // Measurement must never interfere with the experience.
  });
}
