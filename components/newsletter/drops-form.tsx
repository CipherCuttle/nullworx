"use client";

import Link from "next/link";
import { useId, useRef, useState, type FormEvent } from "react";
import { trackClientEvent } from "@/lib/analytics/client";
import type { NewsletterApiError, NewsletterApiSuccess } from "@/lib/newsletter/types";
import styles from "./drops-form.module.css";

type FormStatus =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; data: NewsletterApiSuccess }
  | { kind: "error"; message: string };

type DropsSource = "home" | "drops" | "effect";

export function DropsForm({ source = "home" }: { source?: DropsSource }) {
  const emailId = useId();
  const dropsId = useId();
  const premiumId = useId();
  const premiumHelpId = useId();
  const errorId = useId();
  const started = useRef(false);
  const [email, setEmail] = useState("");
  const [dropsConsent, setDropsConsent] = useState(false);
  const [premiumMarketing, setPremiumMarketing] = useState(false);
  const [status, setStatus] = useState<FormStatus>({ kind: "idle" });

  function markStarted() {
    if (started.current) return;
    started.current = true;
    trackClientEvent("newsletter_signup_started", {
      location: source === "effect" ? "effect-preview" : source,
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "idle" });

    if (!dropsConsent) {
      setStatus({
        kind: "error",
        message: "Please confirm that you want to receive Nullworx Drops. Premium marketing stays separate.",
      });
      return;
    }

    const form = new FormData(event.currentTarget);
    const honeypot = String(form.get("company") ?? "");
    const idempotencyKey = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    setStatus({ kind: "submitting" });

    try {
      const response = await fetch("/api/newsletter", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body: JSON.stringify({
          email,
          dropsConsent,
          premiumMarketing,
          company: honeypot,
        }),
        credentials: "omit",
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as NewsletterApiSuccess | NewsletterApiError | null;

      if (!response.ok || !data || data.ok !== true) {
        const message =
          data && data.ok === false
            ? data.message
            : "The subscription could not be completed. No email was stored. Try again shortly.";
        setStatus({ kind: "error", message });
        return;
      }

      setStatus({ kind: "success", data });
      setEmail("");
      setDropsConsent(false);
      setPremiumMarketing(false);
    } catch {
      setStatus({
        kind: "error",
        message: "The request could not reach the server. No email was stored. Check your connection and try again.",
      });
    }
  }

  const isSubmitting = status.kind === "submitting";

  return (
    <div className={styles.wrapper}>
      <div className={styles.topbar}>
        <span>NL / NULLWORX DROPS</span>
        <span className={styles.mode}><span className="status-dot" /> Optional</span>
      </div>

      {status.kind === "success" ? (
        <div className={styles.success} role="status" aria-live="polite">
          <span className={styles.successIndex}>✓ / RECEIVED</span>
          <h3>Check your inbox.</h3>
          <p>{status.data.message}</p>
          {status.data.preview ? (
            <div className={styles.preview}>
              <span>LOCAL MOCK / NO EMAIL SENT</span>
              <p>{status.data.preview.note}</p>
              <a href={status.data.preview.confirmationUrl}>
                Exercise the confirmation flow <span aria-hidden="true">↗</span>
              </a>
            </div>
          ) : null}
          <button
            className="text-link"
            type="button"
            onClick={() => setStatus({ kind: "idle" })}
          >
            Subscribe another address <span aria-hidden="true">↗</span>
          </button>
        </div>
      ) : (
        <form className={styles.form} onSubmit={onSubmit} noValidate={false}>
          <div className={styles.intro}>
            <label className={styles.emailLabel} htmlFor={emailId}>
              Email address
            </label>
            <input
              className={styles.email}
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@somewhere.dev"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onFocus={markStarted}
              aria-describedby={status.kind === "error" ? errorId : undefined}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className={styles.consentGroup}>
            <label className={styles.checkRow} htmlFor={dropsId}>
              <input
                id={dropsId}
                name="dropsConsent"
                type="checkbox"
                checked={dropsConsent}
                onChange={(event) => setDropsConsent(event.target.checked)}
                disabled={isSubmitting}
                required
              />
              <span className={styles.checkbox} aria-hidden="true" />
              <span>
                Send me <strong>Nullworx Drops</strong>: free effects, experiments, code notes and
                occasional bonus assets.
              </span>
            </label>

            <label className={styles.checkRow} htmlFor={premiumId}>
              <input
                id={premiumId}
                name="premiumMarketing"
                type="checkbox"
                checked={premiumMarketing}
                onChange={(event) => setPremiumMarketing(event.target.checked)}
                disabled={isSubmitting}
                aria-describedby={premiumHelpId}
              />
              <span className={styles.checkbox} aria-hidden="true" />
              <span>
                Also send future <strong>premium pack announcements</strong>, launch offers and
                occasional promotions.
                <small id={premiumHelpId}>Separate opt-in. Leave unchecked and you will still receive Drops.</small>
              </span>
            </label>
          </div>

          <input
            className={styles.honeypot}
            type="text"
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            defaultValue=""
          />

          {status.kind === "error" ? (
            <p className={styles.error} id={errorId} role="alert">
              {status.message}
            </p>
          ) : null}

          <button className={`button ${styles.submit}`} type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending request…" : "Subscribe to Drops"}
            <span className="arrow" aria-hidden="true">
              {isSubmitting ? "·" : "↗"}
            </span>
          </button>

          <p className={styles.finePrint}>
            Double opt-in. No account. Unsubscribe whenever. Read the{" "}
            <Link href="/privacy">privacy notes</Link>. Nothing is sent without confirmation, and the
            two preferences above are stored separately.
          </p>
        </form>
      )}
    </div>
  );
}
