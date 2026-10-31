"use client";
import { useRef, type CSSProperties, type ReactNode, type PointerEvent } from "react";
import styles from "./refraction-card.module.css";

export type RefractionCardProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  intensity?: number;
  paused?: boolean;
  className?: string;
};
/** CSS backdrop material proof. This does not physically refract arbitrary DOM pixels. */
export function RefractionCard({
  eyebrow = "FIELD / 003", title, description, children, intensity = .7, paused = false, className,
}: RefractionCardProps) {
  const ref = useRef<HTMLElement>(null);
  function move(event: PointerEvent<HTMLElement>) {
    if (paused || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / Math.max(1, rect.width);
    const y = (event.clientY - rect.top) / Math.max(1, rect.height);
    ref.current?.style.setProperty("--glass-x", String(Math.round(x * 100)) + "%");
    ref.current?.style.setProperty("--glass-y", String(Math.round(y * 100)) + "%");
  }
  function reset() {
    ref.current?.style.setProperty("--glass-x", "50%");
    ref.current?.style.setProperty("--glass-y", "50%");
  }
  return <article
    ref={ref} className={[styles.card, className].filter(Boolean).join(" ")}
    style={{ "--glass-intensity": Math.max(0, Math.min(1, intensity)) } as CSSProperties}
    data-effect="refraction-card"
    onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}
  >
    <div className={styles.noise} aria-hidden="true" />
    <span className={styles.eyebrow}>{eyebrow}</span>
    <div className={styles.content}>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {children}
    </div>
    <span className={styles.corner} aria-hidden="true">↗</span>
  </article>;
}
