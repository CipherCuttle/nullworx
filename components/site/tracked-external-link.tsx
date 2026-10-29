"use client";

import type { AnalyticsEventName } from "@/lib/analytics/events";
import { trackClientEvent } from "@/lib/analytics/client";

export function TrackedExternalLink({
  href,
  event,
  effectSlug,
  className,
  children,
}: {
  href: string;
  event: Extract<AnalyticsEventName, "source_link_followed">;
  effectSlug?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackClientEvent(event, { effectSlug, location: "effect-preview" })}
    >
      {children}
    </a>
  );
}
