"use client";

import Link from "next/link";
import { AsciiWavesCanvas } from "./ascii-waves-canvas";
import styles from "./home-field.module.css";

export function HomeField() {
  return (
    <figure className={styles.figure}>
      <div className={styles.frame}>
        <div className={styles.topbar}>
          <span>FIELD 001 / ASCII WAVES</span>
          <span className={styles.license}>FLOWER / CC0</span>
        </div>
        <div className={styles.stage}>
          <AsciiWavesCanvas
            testId="home-field"
            priority
            poster={{
              src: "/media/motifs/flower-poster.jpg",
              alt: "A still from the CC0 flower film used to generate the ASCII Waves field.",
            }}
            preset="flower"
            cellSize="auto"
            speed={1}
            quality="efficient"
            pointerInteraction
            reducedMotion="system"
            playing
            ariaLabel="Live ASCII Waves field: a flower film rebuilt from moving characters."
          />
          <div className={styles.corners} aria-hidden="true">
            <span>+</span>
            <span>+</span>
            <span>+</span>
            <span>+</span>
          </div>
          <div className={styles.readout}>
            <span className={styles.liveDot} />
            LIVE MATERIAL / WEBGL 2
          </div>
          <div className={styles.status}>OWNER REVIEW / NOT RELEASED</div>
          <span className={styles.axis} aria-hidden="true">
            X / 001
          </span>
          <span className={styles.axisY} aria-hidden="true">
            Y / 059
          </span>
        </div>
        <figcaption className={styles.footer}>
          <div>
            <span className={styles.captionLabel}>CURRENT STUDY</span>
            <span>ASCII Waves / Flower</span>
          </div>
          <Link className={styles.open} href="/lab/ascii-waves">
            Open unlisted preview <span aria-hidden="true">↗</span>
          </Link>
        </figcaption>
      </div>
      <div className={styles.note}>
        <span className={styles.noteIndex}>NOTE 001</span>
        <p>
          A live preview, not a catalogue release. The source review is still open; nothing here is
          for sale, counted or claimed as finished.
        </p>
      </div>
    </figure>
  );
}
