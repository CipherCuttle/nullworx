"use client";

import { useState } from "react";
import {
  HOLO_PRESETS,
  HoloGlyph,
  HoloText,
  type HoloMotionMode,
} from "@/experiments/holotype";
import { holotypeEffect } from "@/lib/labs/effects";
import type { HoloParams } from "@/lib/labs/effects/schemas";
import { usePrefersReducedMotion } from "@/lib/labs/effects/use-prefers-reduced-motion";
import { validateEffectParams } from "@/lib/labs/effects/validate";
import { ControlGroup, Segmented, Slider, Toggle } from "./controls";
import chrome from "./preview-chrome.module.css";
import styles from "./holotype-preview.module.css";

const GLYPH_PATHS = [
  "M100 12 L174 55 L174 141 L100 184 L26 141 L26 55 Z",
  "M100 54 L139 77 L139 119 L100 142 L61 119 L61 77 Z",
] as const;

const presetOptions = HOLO_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.name.replace(" Foil", "").replace(" Hologram", ""),
  title: preset.note,
}));

const toneOptions = [
  { value: "dark" as const, label: "Noir" },
  { value: "light" as const, label: "Paper" },
];

const motionOptions = [
  { value: "auto" as const, label: "OS" },
  { value: "full" as const, label: "Full" },
  { value: "reduced" as const, label: "Reduced" },
];

function initialParams(): HoloParams {
  const result = validateEffectParams(holotypeEffect, holotypeEffect.defaults);
  if (!result.ok) throw new Error(`HoloType defaults failed validation: ${result.issues.join("; ")}`);
  return result.data;
}

export default function HolotypePreview() {
  const [params, setParams] = useState<HoloParams>(initialParams);
  const [issues, setIssues] = useState<string | null>(null);
  const prefersReduced = usePrefersReducedMotion();

  function update(patch: Partial<HoloParams>) {
    const result = validateEffectParams(holotypeEffect, { ...params, ...patch });
    if (!result.ok) {
      setIssues(result.issues.join("; "));
      return;
    }
    setParams(result.data);
    setIssues(null);
  }

  function choosePreset(presetId: HoloParams["preset"]) {
    const preset = HOLO_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;
    update({
      preset: presetId,
      spectral: preset.settings.spectral,
      metallic: preset.settings.metallic,
      grain: preset.settings.grain,
      speed: preset.settings.speed,
      pointer: preset.settings.pointer,
      animated: preset.settings.animated,
    });
  }

  const effectiveMotion: HoloMotionMode =
    params.motion === "auto" && prefersReduced ? "reduced" : params.motion;
  const reduced = effectiveMotion === "reduced" || !params.animated;
  const settings = {
    spectral: params.spectral,
    metallic: params.metallic,
    grain: params.grain,
    speed: params.speed,
    pointer: params.pointer,
    animated: params.animated,
  };

  return (
    <div className={chrome.preview} data-testid="holotype-adapter">
      <section
        className={styles.stage}
        data-testid="holotype-preview"
        data-tone={params.tone}
        data-reduced={reduced ? "true" : "false"}
        data-motion={effectiveMotion}
        aria-label="HoloType foil specimen"
      >
        <div className={chrome.stageMeta}>
          <span>Existing effect / DOM + CSS</span>
          <span>Expansion 02 / material A</span>
          <span>{reduced ? "Static state" : "Sweep active"}</span>
        </div>

        <div className={styles.hero}>
          <p className={styles.eyebrow}>Live text, not a video</p>
          <HoloText
            as="span"
            variant="display"
            preset={params.preset}
            settings={settings}
            tone={params.tone}
            motion={effectiveMotion}
            className={styles.word}
          >
            NULLWORX
          </HoloText>
          <p className={styles.heroNote}>
            One spectral crease, a brushed metal body and a pointer-driven hotspot. The visible
            wordmark stays selectable DOM text.
          </p>
        </div>

        <div className={styles.glyphRow}>
          <HoloGlyph
            label="Nullworx hexagonal monogram"
            preset={params.preset}
            settings={settings}
            tone={params.tone}
            motion={effectiveMotion}
            viewBox="0 0 200 200"
            paths={GLYPH_PATHS}
            strokeWidth={2}
            className={styles.glyphBox}
          />
          <div className={styles.glyphCopy}>
            <strong>Inline SVG, same material.</strong>
            <p>
              The glyph uses HoloType&apos;s public SVG interface. No shader, canvas or third-party
              rendering library is involved.
            </p>
            <span>
              {prefersReduced ? "OS reduced-motion detected" : "OS motion preference: no-preference"} ·{" "}
              {reduced ? "static" : "animated"}
            </span>
          </div>
        </div>

        <div className={chrome.stageFoot}>
          <span>{reduced ? "REDUCED / STATIC" : "LIVE SWEEP"}</span>
          <span>Pointer {params.pointer > 0 ? "active" : "off"}</span>
          <span>{params.preset}</span>
        </div>
      </section>

      <div className={chrome.controls}>
        <div className={chrome.controlsHead}>
          <span>Material controls</span>
          <small>Presets come from the preserved source</small>
        </div>
        <div className={chrome.controlGrid}>
          <ControlGroup label="Preset">
            <Segmented label="HoloType preset" value={params.preset} options={presetOptions} onChange={choosePreset} />
          </ControlGroup>
          <ControlGroup label="Surface">
            <Segmented label="Surface tone" value={params.tone} options={toneOptions} onChange={(tone) => update({ tone })} />
          </ControlGroup>
          <ControlGroup label="Motion">
            <Segmented label="Motion mode" value={params.motion} options={motionOptions} onChange={(motion) => update({ motion })} />
          </ControlGroup>
          <ControlGroup label="Still state" hint="Explicit owner-facing stop">
            <Toggle label="Animated" checked={params.animated} onChange={(animated) => update({ animated })} />
          </ControlGroup>
          <Slider label="Spectral" value={params.spectral} format={(v) => `${Math.round(v * 100)}%`} onChange={(spectral) => update({ spectral })} />
          <Slider label="Metallic" value={params.metallic} format={(v) => `${Math.round(v * 100)}%`} onChange={(metallic) => update({ metallic })} />
          <Slider label="Grain" value={params.grain} format={(v) => `${Math.round(v * 100)}%`} onChange={(grain) => update({ grain })} />
          <Slider label="Sweep speed" value={params.speed} min={0} max={1.6} format={(v) => `${v.toFixed(2)}×`} onChange={(speed) => update({ speed })} />
        </div>
        <p className={chrome.controlsFoot} role="status" aria-live="polite">
          {issues ?? "Runtime validator: params valid. Reduced motion freezes the sweep without losing the metal."}
        </p>
      </div>
    </div>
  );
}
