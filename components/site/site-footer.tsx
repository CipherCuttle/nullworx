import Link from "next/link";
import { NullMark } from "./null-mark";
import { SupportLink } from "./support-link";
import { siteOrigin, supportUrl } from "@/lib/site";
import styles from "./site-footer.module.css";

const indexLinks = [
  { href: "/effects", label: "Effects" },
  { href: "/drops", label: "Nullworx Drops" },
  { href: "/about", label: "About the lab" },
];

const legalLinks = [
  { href: "/privacy", label: "Privacy" },
  { href: "/licenses", label: "Licenses" },
];

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.top}`}>
        <div className={styles.statement}>
          <p className="eyebrow">End of transmission / 001</p>
          <p className={`display ${styles.headline}`}>
            Make the screen
            <br />
            <em>less certain.</em>
          </p>
          <Link className="text-link" href="/effects">
            Follow the release gate <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div className={styles.directory}>
          <div>
            <p className={styles.label}>Index</p>
            <nav aria-label="Footer index">
              {indexLinks.map((link) => (
                <Link href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div>
            <p className={styles.label}>Measures</p>
            <nav aria-label="Legal links">
              {legalLinks.map((link) => (
                <Link href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
              <a href="https://github.com/CipherCuttle/nullworx" target="_blank" rel="noopener noreferrer">
                Source <span aria-hidden="true">↗</span>
              </a>
              {supportUrl ? (
                <SupportLink href={supportUrl}>
                  Buy me a coffee <span aria-hidden="true">↗</span>
                </SupportLink>
              ) : null}
            </nav>
          </div>
        </div>
      </div>

      <div className={`container ${styles.bottom}`}>
        <div className={styles.signature}>
          <NullMark className={styles.footerMark} />
          <span>Nullworx</span>
          <span className={styles.separator}>/</span>
          <span>An independent visual systems lab</span>
        </div>
        <div className={styles.meta}>
          <span>© 2026 CipherCuttle</span>
          <span className={styles.origin}>{siteOrigin.replace("https://", "")}</span>
          <span className={styles.noCookies}>
            <span className="status-dot status-dot--muted" /> No tracking cookies
          </span>
        </div>
      </div>
    </footer>
  );
}
