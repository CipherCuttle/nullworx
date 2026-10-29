"use client";

import Link from "next/link";
import { lazy, Suspense, useMemo, useState } from "react";
import { DEFAULT_EFFECT_ID, EFFECT_DEFINITIONS } from "@/lib/effects";
import type { AnyEffectDefinition, EffectStatus } from "@/lib/effects";
import styles from "./effect-lab.module.css";

const STATUS_LABEL: Record<EffectStatus, string> = {
  approved: "APPROVED",
  "review-pending": "REVIEW PENDING",
  experimental: "EXPERIMENTAL",
  blocked: "BLOCKED",
};

function LicenseList({ effect }: { effect: AnyEffectDefinition }) {
  return (
    <ul className={styles.noticeList}>
      {effect.license.notices.map((notice) => (
        <li key={notice}>{notice}</li>
      ))}
    </ul>
  );
}

export function EffectLab() {
  const [activeId, setActiveId] = useState(DEFAULT_EFFECT_ID);
  const active = EFFECT_DEFINITIONS.find((effect) => effect.id === activeId) ?? EFFECT_DEFINITIONS[0];
  const Preview = useMemo(() => lazy(active.preview.loader), [active]);

  return (
    <div className={styles.lab} data-testid="effect-lab">
      <a className={styles.skip} href="#lab-stage">
        Skip to effect preview
      </a>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Nullworx UI Forge gallery">
          <span className={styles.brandMark} aria-hidden="true">
            N
          </span>
          <span className={styles.brandText}>
            <strong>NULLWORX</strong>
            <small>INTEGRATION FOUNDATION / 01</small>
          </span>
        </Link>
        <div className={styles.headerRight}>
          <span className={styles.version}>G2</span>
          <span className={styles.headerNote}>Experimental lab · not linked from the gallery</span>
          <Link className={styles.galleryLink} href="/">
            UI Forge gallery <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.intro} aria-labelledby="lab-title">
          <div>
            <p className={styles.eyebrow}>PLAN → CHANGESET → VERIFY</p>
            <h1 id="lab-title">
              Three effects.
              <br />
              <span>Three ownership boundaries.</span>
            </h1>
          </div>
          <div className={styles.introCopy}>
            <p>
              UI Forge v0.1 is the foundation. HoloType is the existing effect, imported unchanged and still
              pending owner review. Paper Shaders and Motion are upstream packages behind small adapters.
            </p>
            <p className={styles.introWarning}>
              This route is experimental. A passing technical check is not owner visual approval, and none of
              these effects is a registry item.
            </p>
          </div>
        </section>

        <div className={styles.layout}>
          <nav className={styles.tabs} aria-label="Effect previews">
            {EFFECT_DEFINITIONS.map((effect, index) => (
              <button
                key={effect.id}
                type="button"
                className={styles.tab}
                data-active={effect.id === active.id ? "true" : "false"}
                data-testid={`effect-tab-${effect.id}`}
                onClick={() => setActiveId(effect.id)}
                aria-pressed={effect.id === active.id}
              >
                <span className={styles.tabIndex}>0{index + 1}</span>
                <span className={styles.tabBody}>
                  <strong>{effect.title}</strong>
                  <small>{effect.technology.toUpperCase()}</small>
                </span>
                <span className={styles.tabStatus} data-status={effect.status}>
                  {STATUS_LABEL[effect.status]}
                </span>
              </button>
            ))}
            <p className={styles.tabNote}>
              Switching tabs unmounts the previous adapter, including its WebGL context. This is intentional:
              lifecycle belongs to each adapter.
            </p>
          </nav>

          <section className={styles.stagePanel} id="lab-stage" aria-label={`${active.title} preview`}>
            <div className={styles.stageHead}>
              <span>
                PREVIEW / <strong>{active.title}</strong>
              </span>
              <span>{active.capabilities.webgl ? "WEBGL2" : active.technology.toUpperCase()}</span>
              <span className={styles.stageStatus} data-status={active.status}>
                {STATUS_LABEL[active.status]}
              </span>
            </div>
            <Suspense
              fallback={
                <div className={styles.loading} role="status">
                  Loading adapter…
                </div>
              }
            >
              <Preview key={active.id} />
            </Suspense>
          </section>

          <aside className={styles.contract} aria-label="EffectDefinition contract">
            <div className={styles.contractHead}>
              <span>EFFECT DEFINITION</span>
              <span>v{active.version}</span>
            </div>
            <p className={styles.contractSummary}>{active.summary}</p>
            <dl className={styles.spec}>
              <div>
                <dt>Stable ID</dt>
                <dd>
                  <code>{active.id}</code>
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd data-status={active.status}>{STATUS_LABEL[active.status]}</dd>
              </div>
              <div>
                <dt>Technology</dt>
                <dd>{active.technology}</dd>
              </div>
              <div>
                <dt>Reduced motion</dt>
                <dd>{active.reducedMotion}</dd>
              </div>
              <div>
                <dt>Export targets</dt>
                <dd>{active.exportTargets.length > 0 ? active.exportTargets.join(", ") : "none"}</dd>
              </div>
              <div>
                <dt>Capabilities</dt>
                <dd>
                  {[
                    active.capabilities.interactive ? "interactive" : null,
                    active.capabilities.resizable ? "resizable" : null,
                    active.capabilities.webgl ? "webgl" : "no-webgl",
                    active.capabilities.clientOnly ? "client-only" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              </div>
              <div>
                <dt>License</dt>
                <dd>
                  {active.license.spdx} · {active.license.redistribution}
                </dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>
                  {active.provenance.origin} / <code>{active.provenance.sourcePath}</code>
                </dd>
              </div>
            </dl>
            <div className={styles.notices}>
              <span>Notice files</span>
              <LicenseList effect={active} />
            </div>
            <p className={styles.provenanceNote}>{active.provenance.notes}</p>
          </aside>
        </div>

        <section className={styles.reviewNotes} aria-label="Review boundaries">
          <article>
            <span>FOUNDATION</span>
            <p>
              The three UI Forge components, gallery, registry semantics and test contracts are preserved.
              The home gallery is unchanged; this lab is a separate route.
            </p>
          </article>
          <article>
            <span>OWNERSHIP</span>
            <p>
              HoloType remains a pending owner decision. Paper Shaders ships under Apache-2.0 with its NOTICE.
              Motion ships under MIT. No upstream source is vendored or edited.
            </p>
          </article>
          <article>
            <span>HONEST LIMITS</span>
            <p>
              Chromium-only evidence. Headless software compositing is not a universal frame-rate claim. No
              image, video or marketplace export is implemented in G2.
            </p>
          </article>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>NULLWORX / G2</span>
        <span>NO MERGE · NO DEPLOY · NO OWNER VISUAL APPROVAL CLAIM</span>
        <span>PRODUCTION BUILD EVIDENCE OUTSIDE THIS ROUTE</span>
      </footer>
    </div>
  );
}
