import type { Metadata } from "next";
import Link from "next/link";
import { createPageMetadata } from "@/lib/seo";
import styles from "../status.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Unsubscribed",
  description: "Nullworx Drops unsubscribe confirmation.",
  path: "/drops/unsubscribed",
  noIndex: true,
});

export default async function UnsubscribedPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string; status?: string }>;
}) {
  const query = await searchParams;
  const invalid = query.status === "invalid";
  const preview = query.preview === "1";

  return (
    <main id="main" tabIndex={-1} className={`container ${styles.page}`}>
      <p className="eyebrow">Drops / Preferences</p>
      <div className={styles.panel}>
        <span className={styles.code}>{invalid ? "ERR / TOKEN" : "200 / REMOVED"}</span>
        <h1 className="display">
          {invalid ? (
            <>That link <em>did not hold.</em></>
          ) : (
            <>Quiet again. <em>As requested.</em></>
          )}
        </h1>
        <p>
          {invalid
            ? "The unsubscribe token is invalid or expired. No change was made. Use the unsubscribe link in a Nullworx Drops email or contact the owner."
            : "You have been unsubscribed from Nullworx Drops. No further newsletter messages will be sent to this address. Premium marketing is disabled separately."}
        </p>
        {preview ? (
          <div className={styles.preview}>
            <strong>Local mock.</strong> This unsubscribe was handled by the in-memory test adapter.
            No real subscriber data was changed.
          </div>
        ) : null}
        <div className={styles.actions}>
          <Link className="button" href="/">
            Back to Nullworx <span className="arrow" aria-hidden="true">↗</span>
          </Link>
          <Link className="text-link" href="/drops">Revisit Drops <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </main>
  );
}
