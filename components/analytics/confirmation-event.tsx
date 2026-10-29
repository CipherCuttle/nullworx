"use client";

import { useEffect, useRef } from "react";
import { trackClientEvent } from "@/lib/analytics/client";

export function ConfirmationEvent({ completed }: { completed: boolean }) {
  const sent = useRef(false);
  useEffect(() => {
    if (!completed || sent.current) return;
    sent.current = true;
    trackClientEvent("newsletter_confirmation_completed", { location: "drops" });
  }, [completed]);
  return null;
}
