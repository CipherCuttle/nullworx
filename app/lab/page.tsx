import type { Metadata } from "next";
import Link from "next/link";
import { ADMISSION_COPY, DISPOSITION_COPY } from "@/lib/labs/types";
import { LAB_BLOCKED, LAB_ENTRIES, LAB_INTEGRATED } from "@/lib/labs/catalog";
import { createPageMetadata } from "@/lib/seo";
import styles from "./lab-index.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Developer lab index — unreleased previews",
  description:
    "The consolidated Nullworx developer preview index. Every entry is experimental or owner-review; nothing is released.",
  path: "/lab",
  noIndex: true,
});

const families = ["Character fields", "Living typography", "Visual materials", "Reactive signal UI", "Material × mask"] as const;

export default function LabIndexPage() {
  return (
    <main id="main" tabIndex={-1} className={styles.page}>
      <div className={`container ${styles.inner}`}>
        <header className={styles.hero}>
          <div>
            <p className="eyebrow">Developer previews / one origin</p>
            <h1 className={`display ${styles.title}`}>
              The consolidated <em>lab.</em>
            </h1>
          </div>
          <div className={styles.heroNote}>
            <p>
              Every route below mounts an existing effect or component through the branded Nullworx
              shell. None of these entries is released, approved for publication, indexed or for sale.
            </p>
            <dl>
              <div>
                <dt>Integrated</dt>
                <dd>{String(LAB_INTEGRATED.length).padStart(2, "0")}</dd>
              </div>
              <div>
                <dt>Blocked / deferred</dt>
                <dd>{String(LAB_BLOCKED.length).padStart(2, "0")}</dd>
              </div>
              <div>
                <dt>Released</dt>
                <dd>00</dd>
              </div>
            </dl>
          </div>
        </header>

        <nav className={styles.jump} aria-label="Lab families">
          {families.map((family, index) => {
            const count = LAB_ENTRIES.filter((entry) => entry.family === family).length;
            return (
              <a href={`#family-${index}`} key={family}>
                <span>0{index + 1}</span>
                {family}
                <small>{String(count).padStart(2, "0")}</small>
              </a>
            );
          })}
        </nav>

        {families.map((family, index) => {
          const entries = LAB_ENTRIES.filter((entry) => entry.family === family);
          if (!entries.length) return null;
          return (
            <section className={styles.family} id={`family-${index}`} key={family} aria-labelledby={`family-title-${index}`}>
              <header className={styles.familyHead}>
                <span>0{index + 1}</span>
                <h2 id={`family-title-${index}`}>{family}</h2>
                <small>{String(entries.filter((entry) => entry.disposition === "INTEGRATED").length)} integrated</small>
              </header>

              <div className={styles.cards}>
                {entries.map((entry) => {
                  const integrated = entry.disposition === "INTEGRATED" && entry.route;
                  const content = (
                    <>
                      <div className={styles.cardTop}>
                        <span className={styles.cardId}>{entry.id}</span>
                        <span className={styles.cardStatus} data-disposition={entry.disposition}>
                          {DISPOSITION_COPY[entry.disposition]}
                        </span>
                      </div>
                      <h3>{entry.title}</h3>
                      <p className={styles.cardSubtitle}>{entry.subtitle}</p>
                      <p className={styles.cardSummary}>{entry.summary}</p>
                      <div className={styles.cardFoot}>
                        <span>{ADMISSION_COPY[entry.admission]}</span>
                        <span>{entry.capabilities.technology}</span>
                        {integrated ? <span className={styles.open}>Open preview ↗</span> : null}
                      </div>
                      {entry.blocker ? <p className={styles.blocker}>{entry.blocker}</p> : null}
                    </>
                  );
                  return integrated ? (
                    <Link className={styles.card} href={entry.route!} key={entry.id} data-integrated="true">
                      {content}
                    </Link>
                  ) : (
                    <article className={styles.card} key={entry.id} data-integrated="false">
                      {content}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}

        <footer className={styles.footer}>
          <p>
            The public catalogue remains empty. <Link href="/effects">Inspect the release gate</Link> for
            the difference between a mounted lab and a release decision.
          </p>
          <Link className={styles.back} href="/">
            Back to Nullworx <span aria-hidden="true">↗</span>
          </Link>
        </footer>
      </div>
    </main>
  );
}
