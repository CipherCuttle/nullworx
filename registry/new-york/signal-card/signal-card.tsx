"use client";

import { useId, type HTMLAttributes, type ReactNode } from "react";
import styles from "./signal-card.module.css";

export interface SignalCardProps extends HTMLAttributes<HTMLElement> {
  heading: string;
  metric: ReactNode;
  description?: string;
  status?: "positive" | "neutral" | "warning";
  statusLabel?: string;
  headingLevel?: 2 | 3 | 4;
  actions?: ReactNode;
}

/** A semantic metric card. Pass native buttons or links through actions. */
export function SignalCard({
  heading,
  metric,
  description,
  status,
  statusLabel,
  headingLevel = 3,
  actions,
  className = "",
  children,
  ...props
}: SignalCardProps) {
  const headingId = useId();
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  const labels = { positive: "On track", neutral: "Steady", warning: "Needs attention" };

  return (
    <article {...props} className={`${styles.card} ${className}`.trim()} aria-labelledby={headingId}>
      <div className={styles.topline}>
        <span className={styles.signal} aria-hidden="true">↗</span>
        {status ? (
          <span className={styles.status} data-status={status}>
            <span className={styles.dot} aria-hidden="true" />
            {statusLabel || labels[status]}
          </span>
        ) : null}
      </div>
      <Heading id={headingId} className={styles.heading}>{heading}</Heading>
      <div className={styles.metric}>{metric}</div>
      {description ? <p className={styles.description}>{description}</p> : null}
      {children}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </article>
  );
}
