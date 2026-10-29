import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbJsonLd } from "@/components/seo/json-ld";
import { createPageMetadata } from "@/lib/seo";
import styles from "./about.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "About",
  description:
    "Nullworx is an independent experimental lab for procedural visual effects, built on the preserved UI Forge experiments. Read the principles, origin and release policy.",
  path: "/about",
});

const principles = [
  {
    title: "Make the effect worth discovering.",
    copy: "Distribution follows the work. A release page exists to help someone use an effect, not to inflate a catalogue.",
  },
  {
    title: "Preserve the experiment.",
    copy: "The original UI Forge projects remain untouched. Nullworx is a separate product with explicit source provenance, not a cleanup of history.",
  },
  {
    title: "Do not fake momentum.",
    copy: "No invented testimonials, subscriber counts, download numbers or ratings. A prelaunch catalogue says exactly that.",
  },
  {
    title: "Keep the source legible.",
    copy: "Effects should be readable TypeScript with colocated styles, narrow dependencies and documented failure modes.",
  },
];

const isNot = ["A generic component library", "An account system", "A paid membership", "A content farm", "An AI-generated landing page"];

export default function AboutPage() {
  return (
    <>
      <JsonLd
        id="about-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />
      <main id="main" tabIndex={-1}>
        <section className={`container page-intro`} aria-labelledby="about-title">
          <div className="page-intro__meta">
            <p className="eyebrow">About / Nullworx</p>
            <span className="mono">Independent / prelaunch</span>
          </div>
          <h1 id="about-title" className="display">
            A lab for surfaces that <em>won&rsquo;t sit still.</em>
          </h1>
          <div className="page-intro__lede">
            <p>
              Nullworx is an experimental visual effects library for developers and creative
              coders. It is built and maintained by CipherCuttle, and it is intentionally small.
            </p>
            <div className="page-intro__aside mono">No accounts / no checkout / source when released</div>
          </div>
        </section>

        <section className={`container ${styles.manifesto}`} aria-labelledby="manifesto-title">
          <div className={styles.sideLabel}>
            <span className="eyebrow">01 / Position</span>
            <span className="mono">A small, gated library</span>
          </div>
          <div className={styles.manifestoBody}>
            <h2 id="manifesto-title" className={styles.bigText}>
              Not a catalogue of everything. A considered collection of things that <em>move.</em>
            </h2>
            <div className={styles.proseColumns}>
              <p>
                The current experiments sit where typography, motion and rendering meet: ASCII
                waves, procedural flowers, terminal rain, living stencils, SVG and alpha masking,
                and visual materials. The aim is not to add another wall of generic animated
                components. It is to make a few unusual systems that are genuinely useful and
                worth reading.
              </p>
              <p>
                Effects are free when they are released. There is no account, no checkout and no
                membership in V0.1. An optional newsletter, Nullworx Drops, is the only mailing
                list. A separate, unchecked preference exists for future premium announcements,
                and no premium product is being sold now.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.principles} aria-labelledby="principles-title">
          <div className={`container ${styles.principlesInner}`}>
            <div className={styles.principlesHead}>
              <p className="eyebrow">02 / Working principles</p>
              <h2 id="principles-title" className="display">
                The constraints are the <em>character.</em>
              </h2>
            </div>
            <div className={styles.principleGrid}>
              {principles.map((principle, index) => (
                <article key={principle.title}>
                  <span>0{index + 1}</span>
                  <h3>{principle.title}</h3>
                  <p>{principle.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`container ${styles.origin}`} aria-labelledby="origin-title">
          <div>
            <p className="eyebrow">03 / Origin</p>
            <h2 id="origin-title" className="display">
              Built on a trail of <em>experiments.</em>
            </h2>
          </div>
          <div className={styles.originText}>
            <p>
              Nullworx grows out of UI Forge, a body of local experiments in procedural visual
              systems. The ASCII Waves Flower renderer was extracted from that work and reviewed as
              a standalone React component. This foundation carries the reviewed component source
              and the CC0 Flower media without rewriting the renderer.
            </p>
            <p>
              The original experiments remain in place. They were not edited, normalised or
              replaced. The effect manifest records source paths, tree hashes and file hashes so
              the public work can be traced back to the reviewed material.
            </p>
            <p>
              The first candidate is still in <strong>owner review</strong>. Technical completion is
              not visual approval, and neither is release approval. Until the owner records the
              latter, there is no public effect page and no entry in the sitemap.
            </p>
            <Link className="text-link" href="/effects">
              Read the current release state <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>

        <section className={`container ${styles.owner}`} aria-labelledby="owner-title">
          <div className={styles.ownerPanel}>
            <div>
              <p className="eyebrow">04 / The owner</p>
              <h2 id="owner-title" className="display">CipherCuttle</h2>
            </div>
            <div>
              <p>
                Nullworx is an independent project by CipherCuttle. There is no team page pretending
                otherwise. Source, issues and the public record live in the repository.
              </p>
              <a className="text-link" href="https://github.com/CipherCuttle" target="_blank" rel="noopener noreferrer">
                GitHub profile <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
          <div className={styles.notList}>
            <p className="mono">This is not</p>
            <ul>
              {isNot.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className={`container ${styles.contact}`}>
          <h2 className="display">Make something <em>strange.</em></h2>
          <p>
            Follow the lab through Drops, or inspect the release gate. There is nothing to buy and
            nothing to sign into.
          </p>
          <div>
            <Link className="button" href="/drops">Join Drops <span className="arrow" aria-hidden="true">↗</span></Link>
            <Link className="text-link" href="/effects">See the catalogue state <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </main>
    </>
  );
}
