"use client";

import { useId, useRef, useState } from "react";
import { trackClientEvent } from "@/lib/analytics/client";
import { AsciiWavesCanvas, type FieldPlaybackState } from "./ascii-waves-canvas";
import { CopyButton } from "./copy-button";
import styles from "./effect-lab-preview.module.css";

type CellPitch = "auto" | "12" | "16" | "20";
type Quality = "high" | "balanced" | "efficient";

interface Settings {
  cellSize: CellPitch;
  speed: number;
  quality: Quality;
  playing: boolean;
  pointerInteraction: boolean;
}

const defaults: Settings = {
  cellSize: "auto",
  speed: 1,
  quality: "high",
  playing: true,
  pointerInteraction: true,
};

export function EffectLabPreview({
  effectSlug,
  poster,
}: {
  effectSlug: string;
  poster: { src: string; alt: string };
}) {
  const cellId = useId();
  const qualityId = useId();
  const speedId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const interacted = useRef(false);
  const [settings, setSettings] = useState<Settings>(defaults);
  const [fieldState, setFieldState] = useState<FieldPlaybackState | null>(null);
  const phase = fieldState?.phase ?? "loading";

  const config = `const config = {
  cellSize: "${settings.cellSize}",
  speed: ${settings.speed},
  quality: "${settings.quality}",
  playing: ${settings.playing},
  pointerInteraction: ${settings.pointerInteraction},
  reducedMotion: "system",
} as const;`;

  function noteInteraction() {
    if (interacted.current) return;
    interacted.current = true;
    trackClientEvent("preview_interacted", { effectSlug, location: "effect-preview" });
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    noteInteraction();
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <span>
          <span className={styles.liveDot} data-phase={phase} />{" "}
          {phase === "live"
            ? "Live material"
            : phase === "reduced"
              ? "Reduced motion / still"
              : phase === "paused"
                ? "Field paused"
                : phase === "blocked"
                  ? "Autoplay blocked"
                  : phase === "error"
                    ? "Fallback / poster"
                    : phase === "offscreen"
                      ? "Field offscreen"
                      : "Loading field"}
        </span>
        <span className={styles.renderState}>
          {phase === "live"
            ? "WEBGL2 / ACTIVE"
            : phase === "offscreen"
              ? "WEBGL2 / PAUSED OFFSCREEN"
              : phase === "blocked"
                ? "START REQUIRED"
                : phase === "reduced"
                  ? "REDUCED / STILL"
                  : phase === "paused"
                    ? "PAUSED / HELD"
                    : phase === "error"
                      ? "FALLBACK"
                      : "LOADING FIELD"}
        </span>
        <button
          className={styles.reset}
          type="button"
          onClick={() => {
            setSettings(defaults);
            noteInteraction();
          }}
        >
          Reset
        </button>
      </div>

      <div
        className={styles.stage}
        ref={stageRef}
        onPointerDown={noteInteraction}
        data-testid="effect-preview"
      >
        <AsciiWavesCanvas
          poster={poster}
          preset="flower"
          cellSize={settings.cellSize === "auto" ? "auto" : (Number(settings.cellSize) as 12 | 16 | 20)}
          speed={settings.speed}
          quality={settings.quality}
          playing={settings.playing}
          pointerInteraction={settings.pointerInteraction}
          reducedMotion="system"
          ariaLabel="ASCII Waves field made from a flowering plant, rendered as moving characters."
          onStateChange={setFieldState}
        />
        <span className={styles.cornerLabel}>NWX / FIELD 001</span>
        <span className={styles.cornerState}>
          {phase === "live"
            ? "MOTION / ON"
            : phase === "reduced"
              ? "REDUCED / STILL"
              : phase === "paused"
                ? "MOTION / HELD"
                : phase === "blocked"
                  ? "AUTOPLAY / BLOCKED"
                  : "MOTION / WAITING"}
        </span>
        <span className={styles.reducedNote}>Reduced motion freezes the field automatically.</span>
      </div>

      <div className={styles.console}>
        <div className={styles.consoleHead}>
          <span>Material controls</span>
          <CopyButton
            value={config}
            label="Copy config"
            effectSlug={effectSlug}
            className={styles.copyConfig}
          />
        </div>

        <div className={styles.controls}>
          <div className={styles.field}>
            <label htmlFor={cellId}>Cell pitch</label>
            <div className={styles.selectWrap}>
              <select
                id={cellId}
                value={settings.cellSize}
                onChange={(event) => update("cellSize", event.target.value as CellPitch)}
              >
                <option value="auto">Auto / 12–16</option>
                <option value="12">12 px</option>
                <option value="16">16 px</option>
                <option value="20">20 px</option>
              </select>
              <span aria-hidden="true">⌄</span>
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor={qualityId}>Quality</label>
            <div className={styles.selectWrap}>
              <select
                id={qualityId}
                value={settings.quality}
                onChange={(event) => update("quality", event.target.value as Quality)}
              >
                <option value="high">High / DPR 2</option>
                <option value="balanced">Balanced / DPR 1.5</option>
                <option value="efficient">Efficient / DPR 1</option>
              </select>
              <span aria-hidden="true">⌄</span>
            </div>
          </div>

          <div className={`${styles.field} ${styles.rangeField}`}>
            <label htmlFor={speedId}>
              Wave speed <output htmlFor={speedId}>{settings.speed.toFixed(1)}</output>
            </label>
            <input
              id={speedId}
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={settings.speed}
              onChange={(event) => update("speed", Number(event.target.value))}
            />
          </div>

          <div className={styles.toggles}>
            <button
              type="button"
              aria-pressed={settings.playing}
              onClick={() => update("playing", !settings.playing)}
            >
              <span className={styles.toggleDot} /> Motion
            </button>
            <button
              type="button"
              aria-pressed={settings.pointerInteraction}
              onClick={() => update("pointerInteraction", !settings.pointerInteraction)}
            >
              <span className={styles.toggleDot} /> Pointer eddy
            </button>
          </div>
        </div>

        <p className={styles.consoleFoot}>
          Changes are live. Motion off freezes the wave clock, video frame and pointer response
          together.
        </p>
      </div>
    </div>
  );
}
