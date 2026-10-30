"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  AsciiWavesCanvas,
  type AsciiWavesCanvasHandle,
  type FieldPlaybackPhase,
  type FieldPlaybackState,
} from "./ascii-waves-canvas";
import styles from "./home-field.module.css";

const READOUT: Record<FieldPlaybackPhase, { label: string; note: string }> = {
  loading: {
    label: "LOADING / WEBGL 2",
    note: "Waiting for the first decoded frame.",
  },
  live: {
    label: "LIVE MATERIAL / WEBGL 2",
    note: "The source timeline and the rendered field are both advancing.",
  },
  paused: {
    label: "PAUSED / FRAME HELD",
    note: "Playback is held by the visitor. The poster and still frame remain.",
  },
  reduced: {
    label: "REDUCED MOTION / STILL",
    note: "The operating system asks for reduced motion, so the field is intentionally still.",
  },
  blocked: {
    label: "AUTOPLAY BLOCKED / START",
    note: "The browser did not start muted autoplay. Press Start live field to begin.",
  },
  hidden: {
    label: "PAUSED / PAGE HIDDEN",
    note: "Playback pauses while the page is in the background.",
  },
  offscreen: {
    label: "PAUSED / OUT OF VIEW",
    note: "The field pauses while it is outside the viewport.",
  },
  error: {
    label: "FALLBACK / POSTER",
    note: "The live field could not render. The source poster remains visible.",
  },
};

export function HomeField() {
  const fieldRef = useRef<AsciiWavesCanvasHandle>(null);
  const [playing, setPlaying] = useState(true);
  const [state, setState] = useState<FieldPlaybackState | null>(null);
  const phase = state?.phase ?? "loading";
  const reduced = phase === "reduced";
  const blocked = phase === "blocked";
  const failed = phase === "error";
  const readout = READOUT[phase];

  function startField() {
    setPlaying(true);
    void fieldRef.current?.play();
  }

  function togglePlayback() {
    if (playing) {
      setPlaying(false);
      fieldRef.current?.pause();
      return;
    }
    setPlaying(true);
    void fieldRef.current?.play();
  }

  return (
    <figure className={styles.figure} data-home-field data-playback={phase}>
      <div className={styles.frame}>
        <div className={styles.topbar}>
          <span>FIELD 001 / ASCII WAVES</span>
          <span className={styles.license}>FLOWER / CC0</span>
          {reduced ? (
            <span className={styles.motionState}>MOTION / REDUCED</span>
          ) : (
            <button
              className={styles.motionControl}
              type="button"
              onClick={togglePlayback}
              aria-pressed={!playing}
              data-playing={playing}
              title={playing ? "Pause the ASCII Waves field" : "Play the ASCII Waves field"}
            >
              {playing ? "Pause" : "Play"}
            </button>
          )}
        </div>
        <div className={styles.stage}>
          <AsciiWavesCanvas
            ref={fieldRef}
            testId="home-field"
            priority
            poster={{
              src: "/media/motifs/flower-poster.jpg",
              alt: "A still from the CC0 flower film used to generate the ASCII Waves field.",
            }}
            preset="flower"
            cellSize="auto"
            speed={1}
            quality="high"
            pointerInteraction
            reducedMotion="system"
            playing={playing}
            onStateChange={setState}
            ariaLabel="Live ASCII Waves field: a flower film rebuilt from moving characters."
          />
          <div className={styles.corners} aria-hidden="true">
            <span>+</span>
            <span>+</span>
            <span>+</span>
            <span>+</span>
          </div>
          <div
            className={styles.readout}
            data-phase={phase}
            role="status"
            aria-live="polite"
            title={readout.note}
          >
            <span className={styles.liveDot} />
            {readout.label}
          </div>
          <div className={styles.status}>OWNER REVIEW / NOT RELEASED</div>
          <span className={styles.axis} aria-hidden="true">
            X / 001
          </span>
          <span className={styles.axisY} aria-hidden="true">
            Y / 059
          </span>

          {blocked ? (
            <button className={styles.startOverlay} type="button" onClick={startField}>
              <strong>Start live field</strong>
              <small>The browser paused muted autoplay. One press begins the source timeline.</small>
            </button>
          ) : null}

          {failed ? (
            <div className={styles.fallbackNote} role="status">
              <strong>Live field unavailable</strong>
              <small>{state?.message ?? "The poster remains as the review image."}</small>
            </div>
          ) : null}

          {reduced ? (
            <p className={styles.reducedNote}>
              Reduced motion is active. The field is intentionally frozen; no LIVE claim is made.
            </p>
          ) : null}
        </div>
        <figcaption className={styles.footer}>
          <div>
            <span className={styles.captionLabel}>CURRENT STUDY</span>
            <span>ASCII Waves / Flower</span>
          </div>
          <div className={styles.footerLinks}>
            <Link className={styles.open} href="/lab/ascii-waves">
              Open unlisted preview <span aria-hidden="true">↗</span>
            </Link>
            <Link className={styles.open} href="/lab">
              All lab previews <span aria-hidden="true">↗</span>
            </Link>
          </div>
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
