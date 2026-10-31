"use client";

import type { MouseEvent, PointerEvent } from "react";
import { useRef } from "react";
import { useReducedMotion } from "./use-reduced-motion";
import styles from "./magnetic-focus.module.css";

export type MagneticFocusProps = {
  label?: string;
  intensity?: number;
  paused?: boolean;
  disabled?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

/** Only pointer input displaces the button. Keyboard focus stays in place. */
export function MagneticFocus({
  label = "ENTER THE FIELD", intensity = 0.6, paused = false, disabled = false, onClick, className,
}: MagneticFocusProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const canMove = !paused && !reducedMotion && !disabled;
  function reset() {
    if (!ref.current) return;
    ref.current.style.setProperty("--mf-x", "0px");
    ref.current.style.setProperty("--mf-y", "0px");
    ref.current.style.setProperty("--mf-px", "50%");
    ref.current.style.setProperty("--mf-py", "50%");
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    if (!canMove || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const range = Math.max(0, Math.min(1, intensity)) * 12;
    const dx = Math.max(-1, Math.min(1, (x - rect.width / 2) / Math.max(1, rect.width / 2)));
    const dy = Math.max(-1, Math.min(1, (y - rect.height / 2) / Math.max(1, rect.height / 2)));
    event.currentTarget.style.setProperty("--mf-x", `${(dx * range).toFixed(2)}px`);
    event.currentTarget.style.setProperty("--mf-y", `${(dy * range).toFixed(2)}px`);
    event.currentTarget.style.setProperty("--mf-px", `${Math.round((x / Math.max(1, rect.width)) * 100)}%`);
    event.currentTarget.style.setProperty("--mf-py", `${Math.round((y / Math.max(1, rect.height)) * 100)}%`);
  }
  return (
    <button
      ref={ref} type="button" disabled={disabled}
      className={[styles.button, className].filter(Boolean).join(" ")}
      data-effect="magnetic-focus" data-motion={canMove ? "enabled" : "disabled"}
      onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset} onBlur={reset}
      onClick={onClick}
    >
      <span className={styles.glow} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
      <span className={styles.arrow} aria-hidden="true">↗</span>
    </button>
  );
}
