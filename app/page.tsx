import type { Metadata } from "next";
import Link from "next/link";
import { HomeField } from "@/components/effects/home-field";
import { DropsForm } from "@/components/newsletter/drops-form";
import { JsonLd, buildSiteJsonLd } from "@/components/seo/json-ld";
import { getEffectStatusCounts } from "@/lib/effects";
import { RELEASE_STATUS_COPY } from "@/lib/effects/schema";
import { homeMetadata } from "@/lib/seo";
import styles from "./home.module.css";

export const metadata: Metadata = homeMetadata();

const areas = [
  {
    number: "01",
    title: "Character fields",
    description:
      "Video, chance and time rebuilt as whole characters. ASCII waves, terminal rain and animated glyph systems.",
    status: "One study in review",
    tags: ["ASCII", "WebGL", "Glyphs"],
  },
  {
    number: "02",
    title: "Living stencils",
    description:
      "Masks that keep the grain of their material. Cell mosaics, SVG cut-outs and alpha fields that react.",
    status: "Research",
    tags: ["SVG", "Alpha", "Masks"],
  },
  {
    number: "03",
    title: "Botanical systems",
    description:
      "Flowers and growth structures generated from rules rather than drawn frame by frame.",
    status: "Research",
    tags: ["Generative", "Motion"],
  },
  {
    number: "04",
    title: "Visual materials",
    description:
      "Light, ink, caustics and noise treated as substances with weight, not as background dressing.",
    status: "Research",
    tags: ["Materials", "Shaders"],
  },
] as const;

const elementalRules = [
  {
    number: "A",
    title: "The effect is the interface.",
    copy: "A live field should earn its place on the page. No hero image pretending to be software.",
  },
  {
    number: "B",
    title: "Source is part of the design.",
    copy: "Readable TypeScript, colocated styles, no hidden runtime. Copy it, keep it, change it.",
  },
  {
    number: "C",
    title: "A release is a decision, not a build.",
    copy: "Compiling is not publishing. Art, provenance, accessibility and the owner all have to agree.",
  },
] as const;

export default function HomePage() {
  const counts = getEffectStatusCounts();

  return (
    <>
      <JsonLd id="home-jsonld" data={buildSiteJsonLd()} />
      <main id="main" tabIndex={-1}>
        <section className={`container ${styles.hero}`} aria-labelledby="home-title">
          <div className={styles.heroMeta}>
            <p className="eyebrow">An independent visual effects laboratory</p>
            <span className="mono">Est. 2026 / v0.1</span>
          </div>

          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <h1 id="home-title" className={`display ${styles.heroTitle}`}>
                The screen is a <em>living</em> surface.
              </h1>

              <div className={styles.heroLede}>
                <p>
                  Nullworx is an experimental library of procedural effects for developers and
                  creative coders. Fields of characters, masks with a pulse, and materials that
                  behave less like decoration and more like weather.
                </p>
                <div className={styles.heroActions}>
                  <Link className="button" href="/lab/ascii-waves">
                    Preview the field <span className="arrow" aria-hidden="true">↗</span>
                  </Link>
                  <Link className="text-link" href="/effects">
                    Read the release gate <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </div>

              <dl className={styles.counts} aria-label="Current lab state">
                <div>
                  <dt>Released</dt>
                  <dd>{String(counts.released).padStart(2, "0")}</dd>
                </div>
                <div>
                  <dt>In owner review</dt>
                  <dd>{String(counts.ownerReview).padStart(2, "0")}</dd>
                </div>
                <div>
                  <dt>Areas explored</dt>
                  <dd>{String(areas.length).padStart(2, "0")}</dd>
                </div>
              </dl>
            </div>

            <div className={styles.heroField} id="field">
              <div className={styles.fieldAside} aria-hidden="true">
                <span>NWX / FIELD NOTES</span>
                <span>59°19′N / 18°04′E</span>
              </div>
              <HomeField />
            </div>
          </div>

          <div className={styles.heroFoot}>
            <span className="mono">Scroll to inspect the material</span>
            <span className="mono">Built for the browser / not the boardroom</span>
          </div>
        </section>

        <div className={styles.signalStrip} aria-label="Nullworx principles">
          <div className={`container ${styles.signalInner}`}>
            {["Procedural, not packaged", "Readable source", "Free when released", "No accounts", "No checkout"].map(
              (signal) => (
                <span key={signal}>
                  <i aria-hidden="true">✳</i>
                  {signal}
                </span>
              ),
            )}
          </div>
        </div>

        <section className={`container ${styles.premise}`} aria-labelledby="premise-title">
          <header className={styles.sectionHead}>
            <p className="eyebrow">01 / Premise</p>
            <span className="mono">A small library with a high bar</span>
          </header>

          <div className={styles.premiseGrid}>
            <div className={styles.premiseStatement}>
              <h2 id="premise-title" className="display">
                Designed to behave like <em>matter.</em>
              </h2>
              <p>
                Most component libraries give you a finished surface. Nullworx starts with a
                behaviour: a field that reads a video, a mask that keeps its grain, a wave that
                reacts to a pointer. The reusable part is the system underneath.
              </p>
              <Link className="text-link" href="/about">
                Read the lab notes <span aria-hidden="true">→</span>
              </Link>
            </div>

            <div className={styles.rules}>
              {elementalRules.map((rule) => (
                <article key={rule.number} className={styles.rule}>
                  <span className={styles.ruleNumber}>{rule.number}</span>
                  <div>
                    <h3>{rule.title}</h3>
                    <p>{rule.copy}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`container ${styles.territory}`} aria-labelledby="territory-title">
          <header className={styles.sectionHead}>
            <p className="eyebrow">02 / Territory</p>
            <span className="mono">Four areas / one release gate</span>
          </header>

          <div className={styles.territoryIntro}>
            <h2 id="territory-title" className="display">
              Four ways of <em>unsettling</em> a rectangle.
            </h2>
            <p>
              These are territories, not promises. Research means the lab is exploring the
              behaviour; it does not mean a download is waiting. The public catalogue stays empty
              until an effect passes review.
            </p>
          </div>

          <ol className={styles.areaList}>
            {areas.map((area) => (
              <li key={area.number} className={styles.area}>
                <span className={styles.areaNumber}>{area.number}</span>
                <h3>{area.title}</h3>
                <p>{area.description}</p>
                <div className={styles.areaMeta}>
                  <span>{area.status}</span>
                  <ul aria-label={`${area.title} techniques`}>
                    {area.tags.map((tag) => (
                      <li key={tag}>{tag}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.gateSection} aria-labelledby="gate-title">
          <div className={`container ${styles.gateGrid}`}>
            <div className={styles.gateCopy}>
              <p className="eyebrow">03 / Release gate</p>
              <h2 id="gate-title" className="display">
                The catalogue opens <em>one gate</em> at a time.
              </h2>
              <p>
                An effect is only public when it has cleared art review, provenance, licensing,
                accessibility and a production check. A status here is not a marketing count.
                It is the actual state of the work.
              </p>
              <Link className="button button--ghost" href="/effects">
                Inspect the gate <span className="arrow" aria-hidden="true">↗</span>
              </Link>
            </div>

            <div className={styles.gatePanel}>
              <div className={styles.gateHead}>
                <span className="mono">Release state / live manifest</span>
                <span className={styles.gatePulse}>
                  <span className="status-dot" /> 01 in review
                </span>
              </div>
              <ol className={styles.gates}>
                {(["EXPERIMENTAL", "OWNER_REVIEW", "APPROVED", "RELEASED"] as const).map(
                  (status, index) => {
                    const copy = RELEASE_STATUS_COPY[status];
                    const active = status === "OWNER_REVIEW";
                    return (
                      <li key={status} className={active ? styles.gateActive : undefined} aria-current={active ? "step" : undefined}>
                        <span className={styles.gateIndex}>0{index + 1}</span>
                        <div>
                          <strong>{copy.label}</strong>
                          <p>{copy.description}</p>
                        </div>
                        {active ? <span className={styles.gateTag}>Current</span> : <span className={styles.gateCount}>—</span>}
                      </li>
                    );
                  },
                )}
              </ol>
              <div className={styles.gateCandidate}>
                <div>
                  <span className="mono">Candidate 001 / ASCII Waves</span>
                  <p>Jellyfish on the homepage, Flower in the lab. Release approval not recorded.</p>
                </div>
                <Link className="text-link" href="/lab/ascii-waves">
                  Unlisted preview <span aria-hidden="true">↗</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={`container ${styles.drops}`} id="drops" aria-labelledby="drops-title">
          <div className={styles.dropsCopy}>
            <p className="eyebrow">04 / Nullworx Drops</p>
            <h2 id="drops-title" className="display">
              Small transmissions. <em>No noise.</em>
            </h2>
            <p>
              An occasional note when something new is worth opening: released effects, code
              notes, experiments and the odd bonus preset. Free, optional, and separate from any
              future product marketing.
            </p>
            <ul className={styles.dropsFacts}>
              <li>First release notes</li>
              <li>Breakdowns &amp; presets</li>
              <li>Unsubscribe whenever</li>
            </ul>
          </div>
          <div className={styles.dropsFormWrap}>
            <DropsForm source="home" />
          </div>
        </section>
      </main>
    </>
  );
}
