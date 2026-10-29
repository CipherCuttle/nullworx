import Link from "next/link";
import { getReleasedEffectBySlug, type EffectManifest } from "@/lib/effects";
import { RELEASE_STATUS_COPY } from "@/lib/effects/schema";
import { SOURCE_REPOSITORY, supportUrl } from "@/lib/site";
import { DropsForm } from "@/components/newsletter/drops-form";
import { SupportLink } from "@/components/site/support-link";
import { CodeSample } from "./code-sample";
import { EffectLabPreview } from "./effect-lab-preview";
import { TrackedExternalLink } from "@/components/site/tracked-external-link";
import styles from "./effect-page.module.css";

type Mode = "lab" | "public";

const gateChecks = [
  "Owner release approval recorded",
  "Source and media provenance hashed",
  "Code and asset licenses verified",
  "Reduced-motion and fallback behaviour verified",
  "Production build and browser smoke tests pass",
];

export function EffectPage({ effect, mode }: { effect: EffectManifest; mode: Mode }) {
  const status = RELEASE_STATUS_COPY[effect.status];
  const released = effect.status === "RELEASED";
  const publicHref = `/effects/${effect.slug}`;
  const sourceUrl = `${SOURCE_REPOSITORY}/tree/main`;
  const relatedEffects = effect.relatedSlugs
    .map((slug) => getReleasedEffectBySlug(slug))
    .filter((item): item is EffectManifest => Boolean(item));

  return (
    <main id="main" tabIndex={-1} className={styles.page} data-page-mode={mode}>
      {mode === "lab" ? (
        <div className={styles.reviewBanner} role="note">
          <div className={`container ${styles.reviewInner}`}>
            <span className={styles.reviewFlag}>Unreleased lab preview</span>
            <p>
              This is an owner-review page, not a public release. It is noindexed, excluded from
              the sitemap and absent from the public catalogue.
            </p>
            <Link href="/effects">Release gate <span aria-hidden="true">↗</span></Link>
            <Link href="/lab">All lab previews <span aria-hidden="true">↗</span></Link>
          </div>
        </div>
      ) : null}

      <div className={`container ${styles.hero}`}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href="/">Nullworx</Link>
          <span aria-hidden="true">/</span>
          {released ? <Link href="/effects">Effects</Link> : <span>Lab</span>}
          <span aria-hidden="true">/</span>
          <span aria-current="page">{effect.name}</span>
        </nav>

        <div className={styles.heroTop}>
          <div>
            <p className="eyebrow">
              {released ? "Released effect" : "Owner review"} / {effect.id}
            </p>
            <h1 className={`display ${styles.title}`}>
              {effect.name}
              <span>{effect.subtitle}</span>
            </h1>
          </div>
          <div className={styles.heroState}>
            <span className={styles.statusBadge} data-status={effect.status}>
              <span className="status-dot" /> {status.label}
            </span>
            <p>{status.description}</p>
          </div>
        </div>

        <div className={styles.heroBottom}>
          <p className={styles.summary}>{effect.summary}</p>
          <ul className={styles.metaTags} aria-label="Effect facts">
            <li>{effect.frameworks.join(" / ")}</li>
            <li>{effect.license.code} code</li>
            <li>{effect.license.media} media</li>
            <li>Updated {effect.publication.updatedAt}</li>
          </ul>
        </div>
      </div>

      <div className={`container ${styles.body}`}>
        <article className={styles.mainColumn}>
          <section aria-labelledby="preview-title">
            <div className={styles.sectionLabel}>
              <span>01 / Material</span>
              <h2 id="preview-title">Live field</h2>
              <span className={styles.sectionNote}>Instrumented preview</span>
            </div>
            <EffectLabPreview effectSlug={effect.slug} poster={effect.previewMedia} />
          </section>

          <section className={styles.section} aria-labelledby="parameters-title">
            <div className={styles.sectionLabel}>
              <span>02 / Parameters</span>
              <h2 id="parameters-title">What can be tuned</h2>
              <span className={styles.sectionNote}>Defaults are reviewed values</span>
            </div>
            <div className={styles.parameterTable} role="table" aria-label="Effect parameters">
              <div className={styles.parameterHead} role="row">
                <span role="columnheader">Parameter</span>
                <span role="columnheader">Default</span>
                <span role="columnheader">Behaviour</span>
              </div>
              {effect.config.map((field) => (
                <div className={styles.parameterRow} role="row" key={field.key}>
                  <span role="cell">
                    <code>{field.key}</code>
                    <small>{field.label}</small>
                  </span>
                  <span role="cell">
                    {field.type === "range" ? String(field.default) : field.type === "toggle" ? (field.default ? "true" : "false") : field.default}
                  </span>
                  <span role="cell">{field.description}</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section} aria-labelledby="technical-title">
            <div className={styles.sectionLabel}>
              <span>03 / Technical</span>
              <h2 id="technical-title">How it behaves</h2>
              <span className={styles.sectionNote}>One renderer / one draw call</span>
            </div>
            <p className={styles.leadParagraph}>{effect.technicalDescription}</p>
            <div className={styles.noteColumns}>
              <div>
                <span className="mono">Requirements</span>
                <ul className={styles.bulletList}>
                  {effect.requirements.map((requirement) => (
                    <li key={requirement}>{requirement}</li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="mono">Accessibility</span>
                <p>{effect.accessibility.summary}</p>
                <p className={styles.smallNote}>
                  <strong>Reduced motion:</strong> {effect.accessibility.reducedMotion}
                </p>
              </div>
            </div>
          </section>

          <section className={styles.section} aria-labelledby="install-title">
            <div className={styles.sectionLabel}>
              <span>04 / Source</span>
              <h2 id="install-title">Use it</h2>
              <span className={styles.sectionNote}>
                {released ? "Release package" : "Review-only package"}
              </span>
            </div>
            <div className={styles.releaseLock}>
              <span>{released ? "RELEASED / DISTRIBUTION OPEN" : "REVIEW ARTIFACT / NOT A RELEASE"}</span>
              <p>
                {released
                  ? "The archive below is the reviewed release package. Keep the license and media credits with the code."
                  : "This archive is kept for owner evaluation. It is not a Nullworx release; do not present it as one until the owner records approval."}
              </p>
              <a className={styles.download} href={effect.installation.archivePath} download>
                Download {released ? "source" : "review bundle"} <span aria-hidden="true">↓</span>
              </a>
            </div>
            <CodeSample
              filename="install.sh"
              label="Copy command"
              code={`# Download the archive from this page, then:\n${effect.installation.command}`}
              effectSlug={effect.slug}
              caption={effect.installation.notes[0]}
            />
            <CodeSample
              filename="field.tsx"
              label="Copy usage"
              code={effect.installation.usage}
              effectSlug={effect.slug}
              caption="The component fills its parent. Give that parent an explicit height or aspect ratio."
            />
          </section>

          <section className={styles.section} aria-labelledby="performance-title">
            <div className={styles.sectionLabel}>
              <span>05 / Performance</span>
              <h2 id="performance-title">Measured, with caveats</h2>
              <span className={styles.sectionNote}>Source-review numbers</span>
            </div>
            <p className={styles.leadParagraph}>{effect.performance.summary}</p>
            <div className={styles.measurements}>
              {effect.performance.measurements.map((measurement) => (
                <div key={measurement.label}>
                  <span>{measurement.label}</span>
                  <strong>{measurement.value}</strong>
                  <p>{measurement.context}</p>
                </div>
              ))}
            </div>
            <p className={styles.smallNote}>{effect.performance.caveat}</p>
          </section>

          <section className={styles.section} aria-labelledby="licence-title">
            <div className={styles.sectionLabel}>
              <span>06 / Licence</span>
              <h2 id="licence-title">What you may do</h2>
              <span className={styles.sectionNote}>Code and media are separate</span>
            </div>
            <div className={styles.licenceGrid}>
              <div>
                <span className="mono">Code</span>
                <strong>{effect.license.code}</strong>
                <p>{effect.license.notes}</p>
              </div>
              <div>
                <span className="mono">Media</span>
                <strong>{effect.license.media}</strong>
                <p>
                  Flower media from the MDN sample library. Attribution is retained; the CC0 terms
                  do not require it.
                </p>
              </div>
            </div>
            <ul className={styles.licenceLinks}>
              {effect.license.urls.map((url) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    {url} <span aria-hidden="true">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="provenance-title">
            <div className={styles.sectionLabel}>
              <span>07 / Provenance</span>
              <h2 id="provenance-title">Where this came from</h2>
              <span className={styles.sectionNote}>Hashes, not vibes</span>
            </div>
            <div className={styles.provenance}>
              <p>
                The source was carried from the UI Forge Flower integration. The shader, glyph atlas
                and Flower preset were preserved rather than rewritten. The original experiments
                remain untouched.
              </p>
              <dl>
                <div>
                  <dt>Effect source tree SHA-256</dt>
                  <dd><code>{effect.sourceTreeSha256}</code></dd>
                </div>
                <div>
                  <dt>Upstream Git HEAD</dt>
                  <dd><code>{effect.provenance.upstreamHead}</code></dd>
                </div>
                <div>
                  <dt>Captured</dt>
                  <dd>{effect.provenance.capturedAt}</dd>
                </div>
              </dl>
              <details className={styles.hashDetails}>
                <summary>File hashes ({effect.sourceFiles.length})</summary>
                <ul>
                  {effect.sourceFiles.map((file) => (
                    <li key={file.path}>
                      <span>{file.path}</span>
                      <code>{file.sha256.slice(0, 16)}…</code>
                    </li>
                  ))}
                </ul>
              </details>
              <div className={styles.sourceActions}>
                <TrackedExternalLink
                  href={sourceUrl}
                  event="source_link_followed"
                  effectSlug={effect.slug}
                  className="text-link"
                >
                  Browse the source repository <span aria-hidden="true">↗</span>
                </TrackedExternalLink>
                <span className={styles.sourceNote}>Hash manifest is validated on every build.</span>
              </div>
            </div>
          </section>

          {relatedEffects.length > 0 ? (
            <section className={styles.section} aria-labelledby="related-title">
              <div className={styles.sectionLabel}>
                <span>08 / Related</span>
                <h2 id="related-title">Other released fields</h2>
                <span className={styles.sectionNote}>Public catalogue only</span>
              </div>
              <ul className={styles.relatedList}>
                {relatedEffects.map((related) => (
                  <li key={related.id}>
                    <Link href={`/effects/${related.slug}`}>
                      <span className="mono">{related.id}</span>
                      <strong>{related.name} / {related.subtitle}</strong>
                      <span>{related.summary}</span>
                      <i aria-hidden="true">↗</i>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </article>

        <aside className={styles.sidebar} aria-label="Effect status and metadata">
          <div className={styles.sidePanel}>
            <div className={styles.sideHead}>
              <span>Release status</span>
              <span className={styles.statusValue} data-status={effect.status}>{status.label}</span>
            </div>
            <div className={styles.gateList}>
              {gateChecks.map((check, index) => {
                const complete = released;
                return (
                  <div key={check}>
                    <span className={complete ? styles.checkDone : styles.checkPending} aria-hidden="true">
                      {complete ? "✓" : "·"}
                    </span>
                    <span>{check}</span>
                    <small>{complete ? "Pass" : index === 0 ? "Open" : "Prepared"}</small>
                  </div>
                );
              })}
            </div>
            <p className={styles.sideNote}>
              {released
                ? "Released to the public catalogue and included in the sitemap."
                : "No public catalogue entry exists. The only page is this unlisted lab preview."}
            </p>
            <Link className="button button--small" href="/effects">
              See the release gate <span className="arrow" aria-hidden="true">↗</span>
            </Link>
          </div>

          <div className={styles.sidePanel}>
            <div className={styles.sideHead}>
              <span>At a glance</span>
            </div>
            <dl className={styles.factList}>
              <div>
                <dt>Effect ID</dt>
                <dd>{effect.id}</dd>
              </div>
              <div>
                <dt>Version</dt>
                <dd>{effect.version}</dd>
              </div>
              <div>
                <dt>Categories</dt>
                <dd>{effect.categories.join(", ")}</dd>
              </div>
              <div>
                <dt>Frameworks</dt>
                <dd>{effect.frameworks.join(", ")}</dd>
              </div>
              <div>
                <dt>Released</dt>
                <dd>{effect.publication.releasedAt ?? "Not yet"}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{effect.publication.updatedAt}</dd>
              </div>
              <div>
                <dt>Public URL</dt>
                <dd>{released ? publicHref : "Not assigned"}</dd>
              </div>
            </dl>
          </div>

          <div className={styles.dropsCard}>
            <span className="mono">Nullworx Drops</span>
            <p>Hear when the next effect clears the gate. Free, optional, double opt-in.</p>
            <Link className="text-link" href="/drops">
              Subscribe to the letter <span aria-hidden="true">→</span>
            </Link>
          </div>
        </aside>
      </div>

      <div className={`container ${styles.requirements}`}>
        <div>
          <p className="eyebrow">Before you copy</p>
          <h2>Source is a responsibility, not a flex.</h2>
        </div>
        <ul>
          {effect.installation.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </div>

      <section className={`container ${styles.dropsSection}`} aria-labelledby="effect-drops-title">
        <div className={styles.dropsSectionCopy}>
          <p className="eyebrow">09 / Nullworx Drops</p>
          <h2 id="effect-drops-title" className="display">
            Hear when the gate <em>opens.</em>
          </h2>
          <p>
            Drops is a low-frequency note when an effect is released, with the source decisions,
            performance notes and the occasional free extra behind it. One address, two separate
            choices, no account.
          </p>
          <p className={styles.dropsFinePrint}>
            Free newsletter consent is required. Future premium announcements and offers are a
            separate unchecked opt-in and are never implied by Drops.
          </p>
          {supportUrl ? (
            <SupportLink
              href={supportUrl}
              location="effect-preview"
              className={`text-link ${styles.supportLink}`}
            >
              Buy me a coffee <span aria-hidden="true">↗</span>
            </SupportLink>
          ) : null}
        </div>
        <div className={styles.dropsFormWrap}>
          <DropsForm source="effect" />
        </div>
      </section>
    </main>
  );
}
