import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmationEvent } from "@/components/analytics/confirmation-event";
import { createPageMetadata } from "@/lib/seo";
import styles from "../status.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Subscription confirmed",
  description: "Nullworx Drops subscription confirmation.",
  path: "/drops/confirmed",
  noIndex: true,
});

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; status?: string }>;
}) {
  const query = await searchParams;
  const invalid = query.status === "invalid";
  const preview = query.preview === "1";

  return (
    <main id="main" tabIndex={-1} className={`container ${styles.page}`}>
      <ConfirmationEvent completed={!invalid} />
      <p className="eyebrow">Drops / Confirmation</p>
      <div className={styles.panel}>
        <span className={styles.code}>{invalid ? "ERR / TOKEN" : preview ? "MOCK / CONFIRMED" : "200 / CONFIRMED"}</span>
        <h1 className="display">
          {invalid ? (
            <>That link <em>did not hold.</em></>
          ) : (
            <>You are <em>in the loop.</em></>
          )}
        </h1>
        <p>
          {invalid
            ? "The confirmation token is invalid or expired. No subscription was confirmed. You can request a fresh link from the Drops page."
            : "Your Drops subscription is confirmed. Future notes will arrive only when there is something worth sending."}
        </p>
        {preview ? (
          <div className={styles.preview}>
            <strong>Local mock.</strong> This page was produced by the in-memory test adapter. No
            email was sent and no real subscriber data was stored outside this process.
          </div>
        ) : null}
        <div className={styles.actions}>
          <Link className="button" href={invalid ? "/drops" : "/"}>
            {invalid ? "Return to Drops" : "Back to Nullworx"} <span className="arrow" aria-hidden="true">↗</span>
          </Link>
          <Link className="text-link" href="/privacy">Read privacy notes <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </main>
  );
}
