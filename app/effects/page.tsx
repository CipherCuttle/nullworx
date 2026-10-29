import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbJsonLd } from "@/components/seo/json-ld";
import { getEffectStatusCounts, getLabEffects, getReleasedEffects } from "@/lib/effects";
import { RELEASE_STATUS_COPY } from "@/lib/effects/schema";
import { createPageMetadata } from "@/lib/seo";
import styles from "./effects.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Effects",
  description:
    "The Nullworx effects catalogue is release-gated. No effect is public until its art, provenance, licenses, accessibility and production build have been reviewed. Current status: prelaunch.",
  path: "/effects",
});

const gateCriteria = [
  {
    title: "Art & behaviour",
    copy: "The owner has seen the live material and approved what it does, not just that it compiles.",
  },
  {
    title: "Provenance & rights",
    copy: "Every source file and media asset has a recorded origin, hash and redistribution path.",
  },
  {
    title: "Docs & accessibility",
    copy: "Parameters, reduced motion, fallbacks, browser requirements and copyable usage exist.",
  },
  {
    title: "Release record",
    copy: "An explicit owner approval, release date and public index entry are written into the manifest.",
  },
] as const;

export default function EffectsPage() {
  const counts = getEffectStatusCounts();
  const labEffects = getLabEffects();
  const released = getReleasedEffects();

  return (
    <>
      <JsonLd
        id="effects-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Effects", path: "/effects" },
        ])}
      />
      <main id="main" tabIndex={-1}>
        <section className={`container page-intro ${styles.intro}`} aria-labelledby="effects-title">
          <div className="page-intro__meta">
            <p className="eyebrow">Public catalogue / Release gate</p>
            <span className="mono">Updated 2026-10-28</span>
          </div>
          <h1 id="effects-title" className="display">
            What is public <em>has earned it.</em>
          </h1>
          <div className="page-intro__lede">
            <p>
              Nullworx is prelaunch. No effect has passed the final release gate, so the catalogue
              has nothing to download yet. That is a deliberate state, not a missing page.
            </p>
            <div className="page-intro__aside">
              <span className="mono">Released</span>
              <span className={styles.bigCount}>{String(counts.released).padStart(2, "0")}</span>
            </div>
          </div>
        </section>

        <section className={`container ${styles.statusSection}`} aria-labelledby="status-title">
          <div className={styles.statusHead}>
            <p className="eyebrow">01 / Manifest state</p>
            <h2 id="status-title" className={styles.srTitle}>Effect status counts</h2>
            <span className="mono">Generated from the typed registry</span>
          </div>
          <ul className={styles.statusGrid}>
            <li data-active={counts.released > 0}>
              <span className={styles.statusLabel}>Released</span>
              <span className={styles.statusNumber}>{String(counts.released).padStart(2, "0")}</span>
              <p>Indexable, documented, downloadable.</p>
            </li>
            <li data-active={counts.approved > 0}>
              <span className={styles.statusLabel}>Approved</span>
              <span className={styles.statusNumber}>{String(counts.approved).padStart(2, "0")}</span>
              <p>Art accepted; release checks still open.</p>
            </li>
            <li data-active={counts.ownerReview > 0} className={styles.statusCurrent}>
              <span className={styles.statusLabel}>Owner review</span>
              <span className={styles.statusNumber}>{String(counts.ownerReview).padStart(2, "0")}</span>
              <p>Built, but not approved for public release.</p>
            </li>
            <li data-active={counts.experimental > 0}>
              <span className={styles.statusLabel}>Experimental</span>
              <span className={styles.statusNumber}>{String(counts.experimental).padStart(2, "0")}</span>
              <p>Sketching territory. Not a product promise.</p>
            </li>
          </ul>
        </section>

        <section className={styles.gateSection} aria-labelledby="gate-title">
          <div className={`container ${styles.gateGrid}`}>
            <div className={styles.gateCopy}>
              <p className="eyebrow">02 / The gate</p>
              <h2 id="gate-title" className="display">
                Four states.
                <br />
                <em>One direction.</em>
              </h2>
              <p>
                A typed manifest decides what can be public. Status is data, not a badge applied by
                hand. The sitemap and public renderer only read effects with a recorded release
                approval and <code>RELEASED</code> status.
              </p>
              <Link className="button button--ghost" href="/about">
                How the lab works <span className="arrow" aria-hidden="true">↗</span>
              </Link>
            </div>

            <ol className={styles.gates}>
              {(["EXPERIMENTAL", "OWNER_REVIEW", "APPROVED", "RELEASED"] as const).map((status, index) => {
                const copy = RELEASE_STATUS_COPY[status];
                const active = status === "OWNER_REVIEW" && counts.ownerReview > 0;
                return (
                  <li key={status} className={active ? styles.gateActive : undefined}>
                    <div className={styles.gateMarker}>
                      <span>0{index + 1}</span>
                      <i aria-hidden="true" />
                    </div>
                    <div className={styles.gateBody}>
                      <div className={styles.gateTitleRow}>
                        <h3>{copy.label}</h3>
                        {active ? <span className={styles.currentTag}>Current gate</span> : null}
                      </div>
                      <p>{copy.description}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section className={`container ${styles.current}`} aria-labelledby="current-title">
          <div className={styles.currentHead}>
            <p className="eyebrow">03 / Inside the gate</p>
            <span className="mono">No public effect page exists</span>
          </div>

          {labEffects.length > 0 ? (
            labEffects.map((effect) => (
              <article key={effect.id} className={styles.candidate}>
                <div className={styles.candidateNumber}>CANDIDATE / 001</div>
                <div className={styles.candidateMain}>
                  <span className={styles.candidateStatus}>
                    <span className="status-dot" /> {RELEASE_STATUS_COPY[effect.status].label}
                  </span>
                  <h2 id="current-title">
                    {effect.name} <span>/ {effect.subtitle}</span>
                  </h2>
                  <p>{effect.summary}</p>
                  <ul className={styles.candidateFacts}>
                    <li>{effect.frameworks.join(" · ")}</li>
                    <li>{effect.license.media} media</li>
                    <li>Updated {effect.publication.updatedAt}</li>
                  </ul>
                </div>
                <div className={styles.candidateAside}>
                  <p>
                    Technically complete and documented. The owner has not recorded a release
                    approval, so there is no <code>/effects/{effect.slug}</code> page and no sitemap
                    entry.
                  </p>
                  <Link className="text-link" href={`/lab/${effect.slug}`}>
                    Open unlisted preview <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className={styles.candidate}>
              <div className={styles.candidateMain}>
                <h2 id="current-title">Nothing is inside the gate.</h2>
                <p>The manifest currently has no candidate in owner review.</p>
              </div>
            </div>
          )}
        </section>

        <section className={`container ${styles.criteria}`} aria-labelledby="criteria-title">
          <div className={styles.criteriaHead}>
            <p className="eyebrow">04 / Release means</p>
            <h2 id="criteria-title" className="display">
              A checklist, <em>not a vibe.</em>
            </h2>
          </div>
          <div className={styles.criteriaGrid}>
            {gateCriteria.map((criterion, index) => (
              <article key={criterion.title}>
                <span>0{index + 1}</span>
                <h3>{criterion.title}</h3>
                <p>{criterion.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`container ${styles.empty}`}>
          <div>
            <span className={styles.emptyIndex}>CATALOGUE / 000 RELEASED</span>
            <h2 className="display">The first entry will be worth the wait.</h2>
          </div>
          <div className={styles.emptyAside}>
            <p>
              Drops is where releases, source notes and occasional extras will be announced. It is
              optional, double opt-in and not a countdown.
            </p>
            <Link className="button" href="/drops">
              Join Nullworx Drops <span className="arrow" aria-hidden="true">↗</span>
            </Link>
            {released.length === 0 ? (
              <p className={styles.emptyNote}>
                No released effects exist yet. This page is the truthful catalogue state, not an
                error.
              </p>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}
