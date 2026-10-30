import Link from "next/link";
import type { ReactNode } from "react";
import { ADMISSION_COPY, DISPOSITION_COPY, type LabEntry } from "@/lib/labs/types";
import styles from "./lab-shell.module.css";

function statusTone(entry: LabEntry): "live" | "warning" | "error" | "neutral" {
  if (entry.disposition === "BLOCKED") return "error";
  if (entry.disposition === "NOT_INTEGRATED") return "warning";
  if (entry.admission === "OWNER_REVIEW") return "warning";
  return "neutral";
}

export function LabShell({ entry, children }: { entry: LabEntry; children: ReactNode }) {
  const tone = statusTone(entry);
  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <div className={`container ${styles.inner}`}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href="/">Nullworx</Link>
          <span aria-hidden="true">/</span>
          <Link href="/lab">Lab</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{entry.title}</span>
        </nav>

        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className="eyebrow">
              {entry.family} / {entry.id}
            </p>
            <h1 className={`display ${styles.title}`}>
              {entry.title}
              <span>{entry.subtitle}</span>
            </h1>
          </div>
          <div className={styles.heroState}>
            <span className={styles.badge} data-tone={tone}>
              <span aria-hidden="true" />
              {DISPOSITION_COPY[entry.disposition]}
            </span>
            <span className={styles.admission}>{ADMISSION_COPY[entry.admission]}</span>
            <p>No release approval is recorded. This route is noindexed and is not a public catalogue entry.</p>
          </div>
        </header>

        <p className={styles.summary}>{entry.summary}</p>

        <div className={styles.layout}>
          <div className={styles.mainColumn}>{children}</div>

          <aside className={styles.aside} aria-label="Effect capability, source and licensing">
            <section>
              <h2>Capability</h2>
              <dl>
                <div>
                  <dt>Technology</dt>
                  <dd>{entry.capabilities.technology}</dd>
                </div>
                <div>
                  <dt>WebGL</dt>
                  <dd>{entry.capabilities.webgl}</dd>
                </div>
                <div>
                  <dt>Pointer</dt>
                  <dd>{entry.capabilities.pointer ? "Supported" : "Not used"}</dd>
                </div>
                <div>
                  <dt>Client only</dt>
                  <dd>{entry.capabilities.clientOnly ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt>Browsers tested</dt>
                  <dd>{entry.capabilities.browsers.length ? entry.capabilities.browsers.join(" / ") : "Not verified"}</dd>
                </div>
              </dl>
            </section>

            <section>
              <h2>Reduced motion</h2>
              <p>{entry.capabilities.reducedMotion}</p>
            </section>

            <section>
              <h2>Source</h2>
              <dl>
                <div>
                  <dt>Origin</dt>
                  <dd>{entry.source.origin}</dd>
                </div>
                <div>
                  <dt>Path</dt>
                  <dd className={styles.code}>{entry.source.path}</dd>
                </div>
                {entry.source.commit ? (
                  <div>
                    <dt>Commit</dt>
                    <dd className={styles.code}>{entry.source.commit}</dd>
                  </div>
                ) : null}
                {entry.source.head ? (
                  <div>
                    <dt>Source HEAD</dt>
                    <dd className={styles.code}>{entry.source.head}</dd>
                  </div>
                ) : null}
                {entry.source.treeSha256 ? (
                  <div>
                    <dt>Source digest</dt>
                    <dd className={styles.code}>{entry.source.treeSha256}</dd>
                  </div>
                ) : null}
                {entry.implementation ? (
                  <div>
                    <dt>Nullworx path</dt>
                    <dd className={styles.code}>{entry.implementation}</dd>
                  </div>
                ) : null}
              </dl>
              <ul className={styles.notes}>
                {entry.source.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Licence</h2>
              <dl>
                <div>
                  <dt>Code</dt>
                  <dd>{entry.license.code}</dd>
                </div>
                <div>
                  <dt>Assets</dt>
                  <dd>{entry.license.assets}</dd>
                </div>
                <div>
                  <dt>Redistribution</dt>
                  <dd>{entry.license.redistribution}</dd>
                </div>
              </dl>
              <p>{entry.license.notes}</p>
              {entry.license.notices.length ? (
                <ul className={styles.notes}>
                  {entry.license.notices.map((notice) => (
                    <li key={notice}>{notice}</li>
                  ))}
                </ul>
              ) : null}
            </section>

            <section>
              <h2>Verification</h2>
              <div className={styles.verificationHead}>
                <span data-status={entry.verification.status}>{entry.verification.status}</span>
              </div>
              <ul className={styles.notes}>
                {entry.verification.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </section>

            {entry.blocker ? (
              <section className={styles.blocker}>
                <h2>Blocker</h2>
                <p>{entry.blocker}</p>
              </section>
            ) : null}

            <Link className={styles.back} href="/lab">
              All lab previews <span aria-hidden="true">↗</span>
            </Link>
          </aside>
        </div>
      </div>
    </main>
  );
}
