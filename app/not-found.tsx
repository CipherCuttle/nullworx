import type { Metadata } from "next";
import Link from "next/link";
import styles from "./not-found.module.css";

export const metadata: Metadata = {
  title: "Not found",
  description: "This Nullworx route does not exist.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className={`container ${styles.page}`}>
      <div className={styles.meta}>
        <p className="eyebrow">Error / 404</p>
        <span className="mono">Route dissolved</span>
      </div>
      <div className={styles.panel}>
        <span className={styles.code}>NO SIGNAL</span>
        <h1 className="display">
          This page was never <em>here.</em>
        </h1>
        <p>
          The URL may be mistyped, the effect may not be released, or the page may have moved. No
          public effect pages exist before their release approval.
        </p>
        <div className={styles.actions}>
          <Link className="button" href="/">
            Return to Nullworx <span className="arrow" aria-hidden="true">↗</span>
          </Link>
          <Link className="text-link" href="/effects">Inspect the release gate <span aria-hidden="true">→</span></Link>
        </div>
      </div>
    </main>
  );
}
