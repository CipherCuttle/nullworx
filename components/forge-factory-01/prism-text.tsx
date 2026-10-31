"use client";

import type { CSSProperties } from "react";
import styles from "./prism-text.module.css";

export type PrismTextProps = {
  text: string;
  speed?: number;
  intensity?: number;
  paused?: boolean;
  className?: string;
};

/** Original CSS material: no external images, canvas, shaders or font dependencies. */
export function PrismText({
  text, speed = 1, intensity = 0.75, paused = false, className,
}: PrismTextProps) {
  const duration = Math.max(2.5, Math.min(24, 11 / Math.max(0.25, speed)));
  const saturation = 0.75 + Math.max(0, Math.min(1, intensity)) * 1.8;
  const style: CSSProperties = {
    animationDuration: `${duration}s`,
    filter: `saturate(${saturation})`,
    animationPlayState: paused ? "paused" : "running",
  };
  return (
    <span
      className={[styles.prism, className].filter(Boolean).join(" ")}
      style={style}
      data-effect="prism-text"
      data-paused={paused}
    >
      {text}
    </span>
  );
}
