"use client";

import { useEffect, useRef } from "react";
import { trackClientEvent } from "@/lib/analytics/client";

export function EffectPageView({ effectSlug }: { effectSlug: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackClientEvent("effect_page_viewed", { effectSlug, location: "effect-preview" });
  }, [effectSlug]);
  return null;
}
