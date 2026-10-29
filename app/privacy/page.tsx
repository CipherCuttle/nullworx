import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbJsonLd } from "@/components/seo/json-ld";
import { createPageMetadata } from "@/lib/seo";
import { legalUpdated } from "@/lib/site";
import styles from "../legal.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Privacy",
  description:
    "How Nullworx handles email consent, the double opt-in newsletter, anonymous analytics, cookies and subscriber rights. V0.1 ships with newsletter collection disabled by default.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        id="privacy-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Privacy", path: "/privacy" },
        ])}
      />
      <main id="main" tabIndex={-1}>
        <section className="container page-intro" aria-labelledby="privacy-title">
          <div className="page-intro__meta">
            <p className="eyebrow">Privacy / Plain-language record</p>
            <span className="mono">Last updated {legalUpdated}</span>
          </div>
          <h1 id="privacy-title" className="display">
            Little data. <em>Clear choices.</em>
          </h1>
          <div className="page-intro__lede">
            <p>
              Nullworx has no accounts, no checkout and no third-party advertising. The only place
              an email address can enter is the optional Nullworx Drops newsletter.
            </p>
            <div className="page-intro__aside mono">No tracking cookies / no raw email in analytics</div>
          </div>
        </section>

        <div className={`container ${styles.layout}`}>
          <aside className={styles.aside}>
            <p>On this page</p>
            <nav aria-label="Privacy sections">
              <a href="#current-state">Current state</a>
              <a href="#newsletter">Newsletter</a>
              <a href="#analytics">Measurement</a>
              <a href="#cookies">Cookies</a>
              <a href="#retention">Retention</a>
              <a href="#rights">Your choices</a>
              <a href="#contact">Contact</a>
            </nav>
            <p className={styles.contact}>
              Privacy contact
              <br />
              <a href="https://github.com/CipherCuttle" target="_blank" rel="noopener noreferrer">
                CipherCuttle on GitHub ↗
              </a>
            </p>
          </aside>

          <article className="prose">
            <div className={styles.updated}><span /> Operating record / version 1.0</div>

            <div className={styles.notice}>
              <strong>Current V0.1 state:</strong> the repository ships with{" "}
              <code>NEWSLETTER_PROVIDER=disabled</code>. In that state, the signup endpoint returns
              an unavailable message and neither stores nor transmits an email address. A local
              in-memory mock can be enabled for verification; it never sends email. Real collection
              only begins if the owner configures a provider and deploys the site.
            </div>

            <section id="current-state">
              <h2>Current state</h2>
              <p>
                This is a prelaunch foundation. No public effect has been released. There is no
                analytics account, advertising pixel, CRM or payment processor connected to this
                repository. The default newsletter mode is disabled by design so that a preview
                cannot accidentally collect addresses.
              </p>
              <p>
                The privacy contact above is currently the owner&rsquo;s public GitHub profile. A
                dedicated privacy mailbox is a configuration requirement before real subscriber
                collection opens. No solicitation for personal data is made until that gate is
                closed.
              </p>
            </section>

            <section id="newsletter">
              <h2>Nullworx Drops</h2>
              <p>
                Nullworx Drops is a free, optional newsletter. The only subscriber data requested is
                an email address, two separate consent choices and the consent record itself. No
                name, phone number, postal address or account is required.
              </p>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th scope="col">Data</th>
                    <th scope="col">Why it exists</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Email address</td>
                    <td>To send the requested newsletter and to match an unsubscribe request.</td>
                  </tr>
                  <tr>
                    <td>Drops consent</td>
                    <td>To prove that the address opted in to the free newsletter.</td>
                  </tr>
                  <tr>
                    <td>Premium marketing preference</td>
                    <td>An independent, unchecked choice for future premium announcements and offers.</td>
                  </tr>
                  <tr>
                    <td>Consent metadata</td>
                    <td>Consent version, source page, timestamp and a random consent ID. The app does not store the raw IP address.</td>
                  </tr>
                  <tr>
                    <td>Subscription state</td>
                    <td>Pending, confirmed, unsubscribed or suppressed. Double opt-in records the confirmation.</td>
                  </tr>
                </tbody>
              </table>
              <p>
                The intended processor is <strong>Brevo</strong> (Sendinblue SAS), an email service
                provider based in France. Brevo performs the double opt-in confirmation and the
                provider-managed unsubscribe. The owner must complete the Brevo data-processing
                agreement and review its subprocessors before real collection begins. The API
                adapter requests anonymised open/click consent in the DOI call; the owner must also
                disable open and click tracking in campaign settings.
              </p>
              <p>
                Premium marketing is never implied by the free newsletter. The two choices are
                recorded independently, and V0.1 sends no campaigns at all. Details of consent are
                retained in Brevo as attributes and in its DOI event history, not in a custom CRM.
              </p>
              <p>
                If you do not confirm the double opt-in email, the address is not an active
                subscriber. The owner should purge unconfirmed DOI records on a 30-day schedule. This
                is a launch configuration requirement, not a claim that a scheduled purge exists
                today.
              </p>
            </section>

            <section id="analytics">
              <h2>Measurement</h2>
              <p>
                Nullworx uses a first-party, cookieless event sender for a short list of product
                events: effect page viewed, preview interacted with, code copied, source link
                followed, newsletter form started, newsletter confirmation completed, and support
                link clicked.
              </p>
              <p>
                Events may include the page path, an effect slug and a coarse location label such as
                <code>drops</code> or <code>footer</code>. They do not include an email address, raw
                IP address, user-agent, referrer, free text or persistent client identifier. The
                server accepts only allowlisted fields and writes an aggregate event line to the
                application log. The application does not put these events into a database or send
                them to a third party.
              </p>
              <p>
                The hosting provider may keep ordinary web-server access logs under its own terms;
                that is outside this application. No traffic, conversion or revenue metric on this
                site is invented or inferred from a dashboards product.
              </p>
            </section>

            <section id="cookies">
              <h2>Cookies and local storage</h2>
              <p>
                The application does not set analytics, advertising or personalisation cookies. It
                does not use local storage for tracking. A no-cookie notice is shown in the footer
                because the application itself does not require consent-banner tracking. Next.js or
                the hosting platform may use strictly necessary technical storage to serve the site.
              </p>
            </section>

            <section id="retention">
              <h2>Retention and deletion</h2>
              <ul>
                <li>Active subscribers: retained while subscribed and while Drops continues to operate.</li>
                <li>Unsubscribed addresses: removed from the Drops list; a suppression record may remain so another message is not sent accidentally.</li>
                <li>Consent evidence: kept only as long as needed to demonstrate consent and meet legal obligations.</li>
                <li>Mock mode: in-memory only; data disappears when the process stops. No email is sent.</li>
                <li>Deletion requests: the owner will remove the address from the provider after verifying the request, normally within 30 days unless a legal retention duty applies.</li>
              </ul>
            </section>

            <section id="rights">
              <h2>Your choices and rights</h2>
              <p>
                You can leave Drops at any time using the unsubscribe link in a message. The
                premium-marketing choice is separate and can stay off. You may ask for access,
                correction, export or deletion of your subscriber data, or withdraw consent, by
                contacting the owner through the public profile linked on this page.
              </p>
              <p>
                Because the V0.1 default is disabled, there may be no data to retrieve. Do not send
                identity documents or other sensitive information to a public GitHub account; ask for
                a private channel first.
              </p>
            </section>

            <section id="contact">
              <h2>Contact and changes</h2>
              <p>
                Data controller: CipherCuttle, the independent operator of Nullworx. Contact:{" "}
                <a href="https://github.com/CipherCuttle" target="_blank" rel="noopener noreferrer">
                  github.com/CipherCuttle
                </a>
                . The owner must add a dedicated privacy mailbox and legal entity details before
                enabling real collection.
              </p>
              <p>
                This record will be updated when the provider, hosting or retention setup changes.
                The <Link href="/drops">Drops page</Link> explains the two consent choices, and the{" "}
                <Link href="/licenses">licenses page</Link> covers the code and media.
              </p>
            </section>
          </article>
        </div>
      </main>
    </>
  );
}
