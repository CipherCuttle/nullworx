"use client";

import { useState } from "react";
import {
  CRTScreen,
  CRT_PRESETS,
  resolveCRTSettings,
  type CRTMotionMode,
  type CRTPresetId,
  type CRTSettings,
} from "@/experiments/crt-material-lab";
import { usePrefersReducedMotion } from "@/lib/labs/effects/use-prefers-reduced-motion";
import { ControlGroup, Segmented, Slider, Toggle } from "./controls";
import chrome from "./preview-chrome.module.css";
import styles from "./crt-preview.module.css";

const presetOptions = CRT_PRESETS.map((preset) => ({ value: preset.id, label: preset.name, title: preset.note }));

type NumericKey = keyof CRTSettings;

export default function CrtPreview() {
  const [preset, setPreset] = useState<CRTPresetId>("green");
  const [settings, setSettings] = useState<CRTSettings>(() => resolveCRTSettings("green"));
  const [motion, setMotion] = useState<CRTMotionMode>("auto");
  const [still, setStill] = useState(false);
  const prefersReduced = usePrefersReducedMotion();

  const effectiveMotion: CRTMotionMode = prefersReduced || still ? "reduced" : motion;
  const animation = prefersReduced || still ? 0 : settings.animation;
  const active = CRT_PRESETS.find((entry) => entry.id === preset) ?? CRT_PRESETS[0];

  function choosePreset(next: CRTPresetId) {
    setPreset(next);
    setSettings(resolveCRTSettings(next));
  }

  function update(key: NumericKey, value: number) {
    setSettings((current) => ({ ...current, [key]: Math.min(1, Math.max(0, value)) }));
  }

  return (
    <div className={chrome.preview} data-testid="crt-adapter">
      <section
        className={styles.stage}
        data-testid="crt-preview"
        data-preset={preset}
        data-reduced={effectiveMotion === "reduced" ? "true" : "false"}
        data-still={still ? "true" : "false"}
        aria-label="CRT Material Lab preview"
      >
        <div className={styles.monitor}>
          <CRTScreen preset={preset} settings={{ ...settings, animation }} motion={effectiveMotion}>
            <div className={styles.terminal}>
              <header className={styles.terminalHead}>
                <span>NWX / SIGNAL BENCH</span>
                <span>CH 03</span>
              </header>
              <div className={styles.terminalBody}>
                <p className={styles.prompt}>nullworx@field:~$ status</p>
                <p className={styles.output}>
                  <span>material</span> CRT / {active.name.toLowerCase()}
                </p>
                <p className={styles.output}>
                  <span>signal</span>{" "}
                  {prefersReduced || still ? "intentionally static" : `live · ${Math.round(settings.animation * 100)}%`}
                </p>
                <p className={styles.output}>
                  <span>content</span> readable DOM text, not a canvas
                </p>
                <div className={styles.actions}>
                  <button type="button">Inspect</button>
                  <button type="button">Hold</button>
                </div>
                <p className={styles.prompt}>nullworx@field:~$ <span className={styles.cursor}>█</span></p>
              </div>
              <footer className={styles.terminalFoot}>
                <span>PHOSPHOR / {preset.toUpperCase()}</span>
                <span>{prefersReduced || still ? "STILL" : "SCANNING"}</span>
              </footer>
            </div>
          </CRTScreen>
        </div>
        <div className={chrome.stageMeta}>
          <span>Existing material / CSS only</span>
          <span>Expansion 02 / CRT</span>
          <span>{prefersReduced ? "OS reduced motion" : still ? "Explicit still" : active.name}</span>
        </div>
        <div className={chrome.stageFoot}>
          <span>{prefersReduced || still ? "MOTION / OFF" : "MOTION / ON"}</span>
          <span>No canvas / no rAF</span>
          <span>Live DOM below the overlays</span>
        </div>
      </section>

      <div className={chrome.controls}>
        <div className={chrome.controlsHead}>
          <span>Signal controls</span>
          <small>Presets and CSS variables are source-owned</small>
        </div>
        <div className={chrome.controlGrid}>
          <ControlGroup label="Preset">
            <Segmented label="CRT preset" value={preset} options={presetOptions} onChange={choosePreset} />
          </ControlGroup>
          <ControlGroup label="Motion" hint={prefersReduced ? "OS preference wins" : "Reduced is a true still"}>
            <Segmented
              label="CRT motion mode"
              value={motion}
              options={[
                { value: "auto" as const, label: "Auto" },
                { value: "full" as const, label: "Full" },
                { value: "reduced" as const, label: "Reduced" },
              ]}
              onChange={setMotion}
            />
          </ControlGroup>
          <ControlGroup label="Still state">
            <Toggle label="Freeze the beam and tears" checked={still} onChange={setStill} />
          </ControlGroup>
          <Slider label="Scanlines" value={settings.scanlines} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update("scanlines", v)} />
          <Slider label="Glow" value={settings.glow} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update("glow", v)} />
          <Slider label="Chromatic split" value={settings.chromatic} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update("chromatic", v)} />
          <Slider label="Noise" value={settings.noise} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update("noise", v)} />
          <Slider label="Distortion" value={settings.distortion} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update("distortion", v)} />
          <Slider label="Animation" value={settings.animation} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update("animation", v)} />
        </div>
        <p className={chrome.controlsFoot}>
          The content remains real, selectable DOM. The CRT layers are decorative overlays; no content
          blur or full-screen flicker loop is used.
        </p>
      </div>
    </div>
  );
}
