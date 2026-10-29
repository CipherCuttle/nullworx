"use client";

import { useState } from "react";
import {
  HOLO_PRESETS,
  HoloGlyph,
  HoloText,
  type HoloMotionMode,
} from "@/experiments/holotype";
import { holotypeEffect } from "@/lib/effects/definitions";
import type { HoloParams } from "@/lib/effects/schemas";
import { usePrefersReducedMotion } from "@/lib/effects/use-prefers-reduced-motion";
import { validateEffectParams } from "@/lib/effects/validate";
import { Labeled, Segmented, Slider, Toggle, ValidationLine } from "./controls";
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
  if (!result.ok) {
    throw new Error(`HoloType defaults failed validation: ${result.issues.join("; ")}`);
  }
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
    <div className={styles.preview} data-testid="holotype-adapter">
      <section
        className={styles.stage}
        data-testid="holotype-preview"
        data-tone={params.tone}
        data-reduced={reduced ? "true" : "false"}
        data-motion={effectiveMotion}
        aria-label="HoloType foil specimen"
      >
        <div className={styles.stageMeta}>
          <span>EXISTING EFFECT</span>
          <span>DOM + CSS · NO WEBGL</span>
          <span className={styles.review}>REVIEW_PENDING</span>
        </div>
        <div className={styles.hero}>
          <p className={styles.eyebrow}>EXPANSION 02 / MATERIAL A</p>
          <HoloText
            as="h3"
            variant="display"
            preset={params.preset}
            settings={settings}
            tone={params.tone}
            motion={effectiveMotion}
            style={{ fontSize: "clamp(3.2rem, 21cqi, 9.5rem)" }}
          >
            FORGE
          </HoloText>
          <p className={styles.heroNote}>Light, given an edge. One spectral crease, not a rainbow fill.</p>
        </div>
        <div className={styles.glyphRow}>
          <HoloGlyph
            label="Nullworx hexagon monogram"
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
              Per-instance gradient IDs; the visible text stays real DOM text. Pointer response is direct,
              with no animation loop.
            </p>
            <span className={styles.factLine}>
              {prefersReduced ? "OS reduced-motion detected" : "OS motion preference: no-preference"} ·{" "}
              {reduced ? "static state" : "animated"}
            </span>
          </div>
        </div>
      </section>

      <div className={styles.controls} aria-label="HoloType adapter controls">
        <Labeled label="Preset">
          <Segmented label="HoloType preset" value={params.preset} options={presetOptions} onChange={choosePreset} />
        </Labeled>
        <Labeled label="Surface tone">
          <Segmented label="Surface tone" value={params.tone} options={toneOptions} onChange={(tone) => update({ tone })} />
        </Labeled>
        <Labeled label="Motion mode" hint="OS honours prefers-reduced-motion">
          <Segmented
            label="Motion mode"
            value={params.motion}
            options={motionOptions}
            onChange={(motion) => update({ motion })}
          />
        </Labeled>
        <Labeled label="Still state">
          <Toggle label="Animated material" checked={params.animated} onChange={(animated) => update({ animated })} />
        </Labeled>
        <Slider
          label="Spectral intensity"
          value={params.spectral}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(spectral) => update({ spectral })}
        />
        <Slider
          label="Metallic reflectivity"
          value={params.metallic}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(metallic) => update({ metallic })}
        />
        <Slider
          label="Grain / microtexture"
          value={params.grain}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(grain) => update({ grain })}
        />
        <Slider
          label="Sweep speed"
          value={params.speed}
          min={0}
          max={1.6}
          step={0.01}
          format={(value) => `${value.toFixed(2)}×`}
          onChange={(speed) => update({ speed })}
        />
        <div className={styles.validationSlot}>
          <ValidationLine issues={issues} />
        </div>
      </div>
    </div>
  );
}
