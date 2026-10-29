"use client";

import { useEffect, useRef, useState } from "react";
import { trackClientEvent } from "@/lib/analytics/client";
import styles from "./copy-button.module.css";

export function CopyButton({
  value,
  label = "Copy code",
  copiedLabel = "Copied",
  effectSlug,
  className,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  effectSlug?: string;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
      if (effectSlug) trackClientEvent("code_copied", { effectSlug, location: "effect-preview" });
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => setState("idle"), 1800);
    } catch {
      setState("failed");
    }
  }

  return (
    <button
      className={`${styles.button} ${className ?? ""}`.trim()}
      type="button"
      onClick={copy}
      aria-live="polite"
    >
      <span aria-hidden="true" className={styles.icon}>
        {state === "copied" ? "✓" : state === "failed" ? "!" : "⧉"}
      </span>
      <span>{state === "copied" ? copiedLabel : state === "failed" ? "Copy unavailable — select the text" : label}</span>
    </button>
  );
}
