"use client";

import { useState } from "react";
import { TerminalRain } from "@/experiments/living-stencils/src/materials/TerminalRain";
import { usePrefersReducedMotion } from "@/lib/labs/effects/use-prefers-reduced-motion";
import { ControlGroup, Slider, Toggle } from "./controls";
import chrome from "./preview-chrome.module.css";
import styles from "./terminal-rain-preview.module.css";

export default function TerminalRainPreview() {
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [density, setDensity] = useState(0.96);
  const [glow, setGlow] = useState(0.85);
  const [pointerResponse, setPointerResponse] = useState(0.9);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prefersReduced = usePrefersReducedMotion();
  const still = !playing || prefersReduced;

  return (
    <div className={chrome.preview} data-testid="terminal-rain-adapter">
      <section
        className={styles.stage}
        data-testid="terminal-rain-preview"
        data-ready={ready ? "true" : "false"}
        data-playing={playing ? "true" : "false"}
        data-reduced={prefersReduced ? "true" : "false"}
        aria-label="Terminal Rain preview"
      >
        <TerminalRain
          playing={playing}
          reducedMotion={prefersReduced}
          speed={speed}
          density={density}
          glow={glow}
          pointerResponse={pointerResponse}
          ariaLabel="Terminal Rain: a moving field of monospace glyphs"
          onReady={() => setReady(true)}
          onError={(next) => setError(next.message)}
        />
        <div className={chrome.stageMeta}>
          <span>Existing material / Canvas 2D</span>
          <span>Living Stencils / Terminal Rain</span>
          <span>{prefersReduced ? "OS reduced motion" : still ? "Held" : "Streaming"}</span>
        </div>
        <div className={styles.stageCopy}>
          <strong>Cold data, falling.</strong>
          <p>
            Three depth layers of whole glyphs, a seeded field and a damped pointer eddy. The
            standalone material is mounted unchanged from the Living Stencils proof.
          </p>
        </div>
        <div className={chrome.stageFoot}>
          <span>{error ? "MATERIAL ERROR" : prefersReduced ? "REDUCED / STATIC" : playing ? "LIVE STREAM" : "PAUSED / STATIC"}</span>
          <span>{error ? error : `${Math.round(density * 100)}% density / ${glow.toFixed(2)} glow`}</span>
          <span>SEED 0x51F15E</span>
        </div>
        {error ? (
          <div className={styles.failure} role="status">
            <strong>Material unavailable</strong>
            <span>{error}</span>
          </div>
        ) : null}
      </section>

      <div className={chrome.controls}>
        <div className={chrome.controlsHead}>
          <span>Stream controls</span>
          <small>Engine and CSS are source-owned</small>
        </div>
        <div className={chrome.controlGrid}>
          <ControlGroup label="Playback">
            <Toggle label="Play stream" checked={playing} onChange={setPlaying} />
          </ControlGroup>
          <Slider label="Speed" value={speed} min={0.2} max={2} format={(v) => `${v.toFixed(2)}×`} onChange={setSpeed} />
          <Slider label="Density" value={density} min={0.2} max={1} format={(v) => `${Math.round(v * 100)}%`} onChange={setDensity} />
          <Slider label="Glow" value={glow} min={0} max={1} format={(v) => v.toFixed(2)} onChange={setGlow} />
          <Slider label="Pointer response" value={pointerResponse} min={0} max={1} format={(v) => v.toFixed(2)} onChange={setPointerResponse} />
        </div>
        <p className={chrome.controlsFoot} role="status" aria-live="polite">
          {error
            ? "The engine reported an error; no live claim is made."
            : prefersReduced
              ? "Reduced motion stops the engine and draws one deterministic frame."
              : playing
                ? "The engine runs only while the route is visible and the page is in the foreground."
                : "Paused: the engine stops and keeps a deterministic still frame."}
        </p>
      </div>
    </div>
  );
}
