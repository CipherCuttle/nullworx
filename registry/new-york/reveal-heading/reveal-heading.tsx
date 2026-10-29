"use client";

import type { CSSProperties, HTMLAttributes } from "react";
import styles from "./reveal-heading.module.css";

export interface RevealHeadingProps extends Omit<HTMLAttributes<HTMLHeadingElement>, "children"> {
  text: string;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /** Total sequence duration in milliseconds, clamped to 0–10000. */
  duration?: number;
  /** Initial delay in milliseconds, clamped to 0–10000. */
  delay?: number;
}

/** A word-by-word reveal on mount. Remount with a new key to replay. */
export function RevealHeading({
  text,
  as: Heading = "h2",
  duration = 700,
  delay = 0,
  className = "",
  style,
  ...props
}: RevealHeadingProps) {
  const safeDuration = Number.isFinite(duration) ? Math.min(10000, Math.max(0, duration)) : 700;
  const safeDelay = Number.isFinite(delay) ? Math.min(10000, Math.max(0, delay)) : 0;
  const parts = text.split(/(\s+)/);
  const wordCount = Math.max(1, parts.filter((part) => part.trim()).length);
  let wordIndex = 0;

  return (
    <Heading {...props} className={`${styles.heading} ${className}`.trim()} style={style}>
      <span className={styles.accessible}>{text}</span>
      <span aria-hidden="true">
        {parts.map((part, index) => {
          if (!part.trim()) return part;
          const offset = wordIndex++ / wordCount;
          return (
            <span
              key={index}
              className={styles.word}
              style={{
                "--reveal-duration": `${safeDuration * 0.6}ms`,
                "--reveal-delay": `${safeDelay + offset * safeDuration * 0.4}ms`,
              } as CSSProperties}
            >
              {part}
            </span>
          );
        })}
      </span>
    </Heading>
  );
}
