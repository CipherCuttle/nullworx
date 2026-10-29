import { CopyButton } from "./copy-button";
import styles from "./code-sample.module.css";

export function CodeSample({
  filename,
  code,
  effectSlug,
  label = "Copy",
  caption,
}: {
  filename: string;
  code: string;
  effectSlug?: string;
  label?: string;
  caption?: string;
}) {
  return (
    <div className={styles.wrap}>
      <div className={styles.bar}>
        <span>{filename}</span>
        <CopyButton value={code} label={label} effectSlug={effectSlug} />
      </div>
      <pre className={styles.code} tabIndex={0}>
        <code>{code}</code>
      </pre>
      {caption ? <p className={styles.caption}>{caption}</p> : null}
    </div>
  );
}
