import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, buildBreadcrumbJsonLd } from "@/components/seo/json-ld";
import { createPageMetadata } from "@/lib/seo";
import styles from "../legal.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Licenses",
  description:
    "Nullworx code, Jellyfish and Flower media, typefaces and dependencies: source credits, MIT, Pexels, CC0 and open font licenses.",
  path: "/licenses",
});

const packages = [
  { name: "next", version: "16.4.3", license: "MIT", use: "Server rendering, routing, metadata" },
  { name: "react / react-dom", version: "19.3.1", license: "MIT", use: "UI runtime and islands" },
  { name: "zod", version: "4.6.7", license: "MIT", use: "Manifest and request validation" },
  { name: "server-only", version: "0.0.1", license: "MIT", use: "Server boundary guard" },
  { name: "Space Grotesk", version: "5.3.0", license: "OFL-1.1", use: "Interface and display sans" },
  { name: "Instrument Serif", version: "5.3.0", license: "OFL-1.1", use: "Editorial display serif" },
  { name: "Space Mono", version: "5.3.0", license: "OFL-1.1", use: "Technical labels and code" },
];

const devPackages = [
  { name: "TypeScript", version: "5.9.3", license: "Apache-2.0" },
  { name: "ESLint", version: "9.39.5", license: "MIT" },
  { name: "eslint-config-next", version: "16.4.3", license: "MIT" },
  { name: "Vitest", version: "4.1.12", license: "MIT" },
  { name: "@playwright/test", version: "1.64.1", license: "Apache-2.0" },
  { name: "@axe-core/playwright", version: "4.14.0", license: "MPL-2.0" },
  { name: "tsx", version: "4.23.15", license: "MIT" },
];

export default function LicensesPage() {
  return (
    <>
      <JsonLd
        id="licenses-breadcrumb-jsonld"
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Licenses", path: "/licenses" },
        ])}
      />
      <main id="main" tabIndex={-1}>
        <section className="container page-intro" aria-labelledby="licenses-title">
          <div className="page-intro__meta">
            <p className="eyebrow">Licenses / Source &amp; assets</p>
            <span className="mono">Last updated 2026-10-30</span>
          </div>
          <h1 id="licenses-title" className="display">
            Take the code. <em>Keep the credit.</em>
          </h1>
          <div className="page-intro__lede">
            <p>
              Nullworx is intended to be copied, changed and learned from. The effect code is open
              source; the media keeps its source licenses; the typefaces are open fonts.
              Each asset keeps its own terms.
            </p>
            <div className="page-intro__aside mono">No effect has been released yet</div>
          </div>
        </section>

        <div className={`container ${styles.layout}`}>
          <aside className={styles.aside}>
            <p>On this page</p>
            <nav aria-label="License sections">
              <a href="#code">Site and effect code</a>
              <a href="#media">Media</a>
              <a href="#fonts">Typefaces</a>
              <a href="#dependencies">Dependencies</a>
              <a href="#references">References</a>
            </nav>
            <p className={styles.contact}>
              Repository
              <br />
              <a href="https://github.com/CipherCuttle/nullworx" target="_blank" rel="noopener noreferrer">
                CipherCuttle/nullworx ↗
              </a>
            </p>
          </aside>

          <article className="prose">
            <div className={styles.updated}><span /> Rights inventory / V0.1</div>

            <div className={styles.notice}>
              This page is an operating inventory, not a replacement for the full license texts.
              The repository&rsquo;s <code>LICENSE</code> file and the upstream license files govern.
              No released effect currently exists; the candidate is in owner review.
            </div>

            <section id="code">
              <h2>Site and effect code</h2>
              <p>
                The Nullworx site code and the ASCII Waves component source are offered under the
                MIT License, copyright 2026 CipherCuttle. The full text is in the{" "}
                <a href="https://github.com/CipherCuttle/nullworx/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">
                  repository LICENSE file
                </a>
                . The effect source is preserved from the local UI Forge Flower integration; the
                original experiments remain their own trees and are not re-licensed by this site.
              </p>
              <p>
                MIT permits commercial use, modification and redistribution with the copyright and
                permission notice. Attribution is appreciated but should not imply an endorsement.
              </p>
            </section>

            <section id="media">
              <h2>ASCII Waves media</h2>
              <p>
                The homepage uses a loop derivative of Jellyfish Tank by Soly Moses / Pexels.
                Flower remains the lab and download reference under <strong>CC0 1.0</strong>.
                The original Flower video and poster are preserved. The site uses separate
                cyclic derivatives for continuous playback; all videos play muted.
              </p>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th scope="col">Asset</th>
                    <th scope="col">Origin</th>
                    <th scope="col">Terms</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Jellyfish loop and poster</td>
                    <td>
                      <a href="https://www.pexels.com/video/jellyfish-tank-28156785/" target="_blank" rel="noopener noreferrer">
                        Soly Moses / Pexels
                      </a>
                    </td>
                    <td>
                      <a href="https://www.pexels.com/license/" target="_blank" rel="noopener noreferrer">Pexels License</a>
                      {" "}· modified loop and luma
                    </td>
                  </tr>
                  <tr>
                    <td>flower.mp4</td>
                    <td>
                      <a href="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4" target="_blank" rel="noopener noreferrer">
                        MDN sample video
                      </a>
                    </td>
                    <td>CC0 1.0 · SHA-256 0cd83d94…4451</td>
                  </tr>
                  <tr>
                    <td>flower-poster.jpg</td>
                    <td>Poster derivative from the approved review</td>
                    <td>CC0 1.0 · SHA-256 fb34be9b…919a</td>
                  </tr>
                  <tr>
                    <td>Koi and Smoke review loops</td>
                    <td>Existing Pexels reels from the preserved experiments</td>
                    <td>Pexels License · source credits in the loop inventory</td>
                  </tr>
                  <tr>
                    <td>Orion review loop</td>
                    <td>
                      <a href="https://svs.gsfc.nasa.gov/14658/" target="_blank" rel="noopener noreferrer">NASA Scientific Visualization Studio</a>
                    </td>
                    <td>Public domain · NASA / Paul Morris</td>
                  </tr>
                </tbody>
              </table>
              <p>
                The <a href="/media/credits/demo-loops.md">loop inventory</a> records the source
                links and modifications for each reel. Jellyfish uses a finer ASCII grid and a
                brighter derived source. The original experiments and the Flower download
                package remain unchanged. No endorsement by a source creator is implied.
              </p>
            </section>

            <section id="fonts">
              <h2>Typefaces</h2>
              <p>
                Space Grotesk, Instrument Serif and Space Mono are self-hosted through Fontsource
                packages and are distributed under the <strong>SIL Open Font License 1.1</strong>.
                They may be used, studied and redistributed with software; the font files are not
                sold separately. The license texts travel with the Fontsource packages in the
                dependency installation.
              </p>
              <p>
                The ASCII Waves canvas uses a system-installed monospace stack rather than bundling
                a font with the effect.
              </p>
            </section>

            <section id="dependencies">
              <h2>Dependencies</h2>
              <p>
                These are the direct runtime packages and typefaces. Transitive licenses are
                available from the package manager and should be included in a distributable
                notice file when the site itself is redistributed.
              </p>
              <table className={`${styles.dataTable} ${styles.packageTable}`}>
                <thead>
                  <tr>
                    <th scope="col">Package</th>
                    <th scope="col">Version</th>
                    <th scope="col">License</th>
                    <th scope="col">Use</th>
                  </tr>
                </thead>
                <tbody>
                  {packages.map((item) => (
                    <tr key={item.name}>
                      <td>{item.name}</td>
                      <td>{item.version}</td>
                      <td>{item.license}</td>
                      <td>{item.use}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                Build and verification tools are not part of the deployed runtime. Their direct
                licenses are recorded for completeness.
              </p>
              <table className={`${styles.dataTable} ${styles.packageTable}`}>
                <thead>
                  <tr>
                    <th scope="col">Dev tool</th>
                    <th scope="col">Version</th>
                    <th scope="col">License</th>
                  </tr>
                </thead>
                <tbody>
                  {devPackages.map((item) => (
                    <tr key={item.name}>
                      <td>{item.name}</td>
                      <td>{item.version}</td>
                      <td>{item.license}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section id="references">
              <h2>References and exclusions</h2>
              <p>
                React Bits was reviewed for gallery and documentation patterns only. Its license is
                MIT with a Commons Clause that restricts redistributing the components themselves;
                no React Bits source, effects, branding or site content is included. Astro,
                Starlight, listmonk, Brevo and HyperFrames were evaluated as references or future
                options; see the architecture notes in the repository.
              </p>
              <p>
                No paid component source, unlicensed font, unlicensed footage or copied marketing copy is
                knowingly included. If you believe an asset is missing a credit, contact the owner
                through the repository.
              </p>
              <p>
                Read the <Link href="/privacy">privacy record</Link> for how subscriber data is
                intended to be handled, or return to the{" "}
                <Link href="/effects">release gate</Link> for current catalogue status.
              </p>
            </section>
          </article>
        </div>
      </main>
    </>
  );
}
