import type { Metadata } from "next";
import Link from "next/link";
import { DropsForm } from "@/components/newsletter/drops-form";
import { createPageMetadata } from "@/lib/seo";
import styles from "./drops.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Drops",
  description:
    "Nullworx Drops is an optional, double opt-in letter about released effects, code notes, experiments and occasional free presets. Free newsletter consent and premium marketing consent stay separate.",
  path: "/drops",
});

const dispatches = [
  {
    number: "01",
    title: "New releases",
    copy: "A short note when an effect clears the release gate, with the source and the decisions behind it.",
  },
  {
    number: "02",
    title: "Lab notes",
    copy: "Technical breakdowns, performance findings and the odd preset that did not become a product.",
  },
  {
    number: "03",
    title: "Occasional extras",
    copy: "A bonus asset or small experiment for subscribers. No drip sequence pretending to be a friendship.",
  },
];

export default function DropsPage() {
  return (
    <main id="main" tabIndex={-1}>
      <section className={`container ${styles.intro}`} aria-labelledby="drops-title">
        <div className={styles.meta}>
          <p className="eyebrow">Nullworx / Dispatches</p>
          <span className="mono">Offered free / always optional</span>
        </div>

        <div className={styles.heading}>
          <h1 id="drops-title" className="display">
            Drops from <em>the lab.</em>
          </h1>
          <p>
            A low-frequency letter for people who want to see what is being made before it pretends
            to be a product. No feed to keep up with. No account. Unsubscribe from any email.
          </p>
        </div>

        <div className={styles.stamp}>
          <span className={styles.stampInner}>DOUBLE<br />OPT-IN<br /><i>↘</i></span>
          <p className="mono">One address. Two separate choices.</p>
        </div>
      </section>

      <section className={`container ${styles.body}`} aria-label="Newsletter details">
        <div className={styles.content}>
          <div className={styles.dispatchList}>
            <p className="eyebrow">What arrives</p>
            {dispatches.map((item) => (
              <article key={item.number}>
                <span>{item.number}</span>
                <div>
                  <h2>{item.title}</h2>
                  <p>{item.copy}</p>
                </div>
              </article>
            ))}
          </div>

          <div className={styles.consentNotes}>
            <p className="eyebrow">Consent, in plain language</p>
            <h2>The newsletter is not a bundle deal.</h2>
            <p>
              The first checkbox asks for permission to send you Nullworx Drops. The second is a
              separate, unchecked choice for future premium pack announcements and promotions.
              Saying yes to one never means yes to the other.
            </p>
            <p>
              The form uses a double opt-in. Your address is not subscribed until you click the
              confirmation link in the email. Brevo is the intended email processor; until the owner
              configures it, the site is in a non-collecting preview state.
            </p>
            <div className={styles.noteGrid}>
              <div>
                <span>Free newsletter</span>
                <strong>Required for Drops</strong>
              </div>
              <div>
                <span>Premium marketing</span>
                <strong>Never prechecked</strong>
              </div>
            </div>
            <Link className="text-link" href="/privacy">
              Read the data notes <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <aside className={styles.formSide} aria-label="Subscribe to Nullworx Drops">
          <DropsForm source="drops" />
          <dl className={styles.faq}>
            <div>
              <dt>How often?</dt>
              <dd>When there is something worth sending. Not on a manufactured schedule.</dd>
            </div>
            <div>
              <dt>Why confirm twice?</dt>
              <dd>So an address is not subscribed by someone else, and the consent record is clear.</dd>
            </div>
            <div>
              <dt>Can I leave?</dt>
              <dd>Yes. Every message includes an unsubscribe link. Confirmation and unsubscribe are handled by the provider.</dd>
            </div>
            <div>
              <dt>Is it really free?</dt>
              <dd>The newsletter is free. There is no checkout, account or paid membership in V0.1.</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className={`container ${styles.manifesto}`}>
        <p>&ldquo;Make the effects worth discovering before optimizing their distribution.&rdquo;</p>
        <span className="mono">Nullworx working principle / 001</span>
      </section>
    </main>
  );
}
