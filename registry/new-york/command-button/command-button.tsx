"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import styles from "./command-button.module.css";

export interface CommandButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "outline" | "ghost";
  accent?: "copper" | "teal" | "violet";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  loadingLabel?: string;
  showArrow?: boolean;
}

/** A native button with a directional hover response. Styles stay local. */
export const CommandButton = forwardRef<HTMLButtonElement, CommandButtonProps>(
  function CommandButton(
    {
      variant = "solid",
      accent = "copper",
      size = "md",
      loading = false,
      loadingLabel = "Working…",
      showArrow = true,
      disabled = false,
      type = "button",
      className = "",
      children,
      ...props
    },
    ref,
  ) {
    return (
      <button
        {...props}
        ref={ref}
        type={type}
        className={`${styles.button} ${className}`.trim()}
        data-variant={variant}
        data-accent={accent}
        data-size={size}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
      >
        {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
        <span>{loading ? loadingLabel : children}</span>
        {showArrow && !loading ? (
          <span className={styles.arrow} aria-hidden="true">↗</span>
        ) : null}
      </button>
    );
  },
);
