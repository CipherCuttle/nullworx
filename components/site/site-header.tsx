import Link from "next/link";
import { NullMark } from "./null-mark";
import styles from "./site-header.module.css";

const nav = [
  { href: "/effects", label: "Effects", note: "00" },
  { href: "/drops", label: "Drops", note: "Post" },
  { href: "/about", label: "About", note: "Lab" },
];

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link className={styles.brand} href="/" prefetch={false}>
          <NullMark className={styles.mark} />
          <span className={styles.word}>
            null<span>worx</span>
          </span>
          <span className={styles.brandMeta}>
            Visual effects
            <br />
            for the web
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Primary navigation">
          {nav.map((item) => (
            <Link className={styles.navLink} href={item.href} key={item.href} prefetch={false}>
              <span>{item.label}</span>
              <small>{item.note}</small>
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <span className={styles.status}>
            <span className="status-dot" />
            Prelaunch
          </span>
          <Link className={`button button--small ${styles.headerCta}`} href="/drops" prefetch={false}>
            Get Drops <span className="arrow" aria-hidden="true">↗</span>
          </Link>
          <details className={styles.mobile}>
            <summary aria-label="Menu — open navigation">
              <span>Menu</span>
              <span className={styles.mobileIcon} aria-hidden="true">
                <i />
                <i />
              </span>
            </summary>
            <nav className={styles.mobilePanel} aria-label="Mobile navigation">
              <p className="mono">Index / 2026</p>
              {nav.map((item, index) => (
                <Link href={item.href} key={item.href} prefetch={false}>
                  <span>0{index + 1}</span>
                  {item.label}
                  <i aria-hidden="true">↗</i>
                </Link>
              ))}
              <Link href="/privacy" prefetch={false}>Privacy</Link>
              <Link href="/licenses" prefetch={false}>Licenses</Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
