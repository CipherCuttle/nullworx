"use client";

import { useState } from "react";
import { HOLO_PRESETS } from "@/experiments/holotype";
import { usePrefersReducedMotion } from "@/lib/labs/effects";
import { holotypeEffect, paperMeshEffect } from "@/lib/labs/effects";
import { PAPER_PRESET_IDS } from "@/lib/labs/effects/schemas";
import {
  HOLOTYPE_MATERIAL,
  MOTH_MASK,
  PAPER_MATERIAL,
  RECIPES,
  RECIPE_A,
  getMask,
  getMaterial,
  maskViewBox,
  validateRecipe,
  type AnyMaterialDefinition,
  type CompositionRecipe,
} from "@/lib/composition";
import { useMaskImage } from "@/lib/composition/use-mask-image";
import { ControlGroup, Segmented, Slider, Toggle, ValidationLine } from "./controls";
import { MATERIAL_SURFACES } from "./composition/surface-registry";
import chrome from "./preview-chrome.module.css";
import styles from "./composition-preview.module.css";

const PRESET_LETTERS = ["A", "B", "C", "D"] as const;

const MASK_OPTIONS = [
  { value: MOTH_MASK.id, label: "Moth", title: "Original vector moth silhouette" },
  { value: "nullworx-wordmark", label: "Wordmark", title: "Live NULLWORX text" },
];

const MATERIAL_OPTIONS = [
  { value: HOLOTYPE_MATERIAL.effect.id, label: "HoloType", title: "Existing HoloType effect" },
  { value: PAPER_MATERIAL.effect.id, label: "Paper Mesh", title: "Paper Shaders MeshGradient" },
];

const HOLO_PRESET_OPTIONS = HOLO_PRESETS.map((preset) => ({
  value: preset.id as string,
  label: preset.name.replace(" Foil", "").replace(" Hologram", ""),
  title: preset.note,
}));

const PAPER_PRESET_OPTIONS = PAPER_PRESET_IDS.map((id) => ({
  value: id as string,
  label: id.charAt(0).toUpperCase() + id.slice(1),
}));

const TONE_OPTIONS = [
  { value: "dark" as const, label: "Noir" },
  { value: "light" as const, label: "Paper" },
];

function initialParams(): Record<string, Record<string, unknown>> {
  return {
    [holotypeEffect.id]: { ...holotypeEffect.defaults, ...RECIPE_A.params },
    [paperMeshEffect.id]: { ...paperMeshEffect.defaults },
  };
}

function materialTitle(material: AnyMaterialDefinition): string {
  return material.effect.title;
}

export default function CompositionPreview() {
  const [maskId, setMaskId] = useState<string>(MOTH_MASK.id);
  const [materialId, setMaterialId] = useState<string>(HOLOTYPE_MATERIAL.effect.id);
  const [paramsByMaterial, setParamsByMaterial] = useState(initialParams);
  const [paused, setPaused] = useState(false);
  const [forceReduced, setForceReduced] = useState(false);
  const [activeRecipeId, setActiveRecipeId] = useState<string | null>(RECIPE_A.id);

  const prefersReduced = usePrefersReducedMotion();
  const reducedMotion = forceReduced || prefersReduced;

  const mask = getMask(maskId) ?? MOTH_MASK;
  const material = getMaterial(materialId) ?? HOLOTYPE_MATERIAL;
  const params = paramsByMaterial[material.effect.id] ?? {};
  const maskImage = useMaskImage(mask);

  const recipe: CompositionRecipe = {
    id: "live-composition",
    version: "1.0.0",
    title: "Live composition",
    mask: { id: mask.id, version: mask.version },
    material: { id: material.effect.id, version: material.effect.version },
    params,
    playback: { paused },
  };
  const validation = validateRecipe(recipe);
  const Surface = MATERIAL_SURFACES[material.surface];
  const issues = validation.ok ? null : validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ");

  function selectMask(next: string) {
    setMaskId(next);
    setActiveRecipeId(null);
  }

  function selectMaterial(next: string) {
    setMaterialId(next);
    setActiveRecipeId(null);
  }

  function updateParams(patch: Record<string, unknown>) {
    setParamsByMaterial((previous) => ({
      ...previous,
      [material.effect.id]: { ...previous[material.effect.id], ...patch },
    }));
    setActiveRecipeId(null);
  }

  function applyRecipe(next: CompositionRecipe) {
    setMaskId(next.mask.id);
    setMaterialId(next.material.id);
    setParamsByMaterial((previous) => ({
      ...previous,
      [next.material.id]: { ...next.params },
    }));
    setPaused(next.playback.paused);
    setActiveRecipeId(next.id);
  }

  function reset() {
    setMaskId(MOTH_MASK.id);
    setMaterialId(HOLOTYPE_MATERIAL.effect.id);
    setParamsByMaterial(initialParams());
    setPaused(false);
    setForceReduced(false);
    setActiveRecipeId(RECIPE_A.id);
  }

  const holoValues = paramsByMaterial[holotypeEffect.id] ?? {};
  const paperValues = paramsByMaterial[paperMeshEffect.id] ?? {};

  return (
    <div
      className={chrome.preview}
      data-testid="composition-lab"
      data-mask={mask.id}
      data-material={material.effect.id}
      data-recipe={activeRecipeId ?? "custom"}
      data-paused={paused ? "true" : "false"}
      data-reduced={reducedMotion ? "true" : "false"}
    >
      <div className={styles.presets} aria-label="Comparison presets">
        {RECIPES.map((entry, index) => {
          const entryMask = getMask(entry.mask.id);
          const entryMaterial = getMaterial(entry.material.id);
          return (
            <button
              key={entry.id}
              type="button"
              className={styles.preset}
              data-testid={`preset-${PRESET_LETTERS[index].toLowerCase()}`}
              data-active={activeRecipeId === entry.id ? "true" : "false"}
              aria-pressed={activeRecipeId === entry.id}
              onClick={() => applyRecipe(entry)}
            >
              <span className={styles.presetLetter}>{PRESET_LETTERS[index]}</span>
              <span className={styles.presetBody}>
                <strong>{entryMask?.title ?? entry.mask.id}</strong>
                <small>× {entryMaterial ? materialTitle(entryMaterial) : entry.material.id}</small>
              </span>
            </button>
          );
        })}
      </div>

      <section
        className={styles.stageFrame}
        id="composition-stage"
        data-testid="composition-stage"
        data-mask-id={mask.id}
        data-material-id={material.effect.id}
        aria-label="Composition stage"
      >
        <div
          className={styles.stageInner}
          data-testid="composition-stage-inner"
          style={{
            aspectRatio: `${mask.coordinates.width} / ${mask.coordinates.height}`,
            ["--stage-bg" as string]: "#0a0c09",
          }}
        >
          {validation.ok ? (
            <Surface
              key={material.effect.id}
              mask={mask}
              maskImage={maskImage}
              params={validation.value.params}
              paused={paused}
              reducedMotion={reducedMotion}
            />
          ) : (
            <div className={styles.surfaceError} role="alert" data-testid="composition-rejected">
              Recipe rejected before render: {issues}
            </div>
          )}
        </div>
        <div className={styles.stageMeta} aria-live="polite">
          <span data-testid="stage-recipe">
            {activeRecipeId ? `PRESET ${activeRecipeId.toUpperCase()}` : "CUSTOM"}
          </span>
          <span>{mask.kind === "text" ? "LIVE TEXT MASK" : "SVG PATH MASK"}</span>
          <span>{material.mask.mechanism.toUpperCase()}</span>
          <span>{reducedMotion ? "REDUCED · STATIC" : paused ? "PAUSED · STATIC" : "ANIMATING"}</span>
        </div>
      </section>

      <div className={chrome.controls}>
        <div className={chrome.controlsHead}>
          <span>Composition controls</span>
          <small>{validation.ok ? validation.value.compatibility.message : "Rejected"}</small>
        </div>
        <div className={chrome.controlGrid}>
          <ControlGroup label="Mask" hint={`${mask.kind} · ${mask.aspectRatio.toFixed(2)}:1`}>
            <Segmented label="Mask" value={mask.id} options={MASK_OPTIONS} onChange={selectMask} />
          </ControlGroup>
          <ControlGroup label="Material" hint={material.effect.status.toUpperCase()}>
            <Segmented label="Material" value={material.effect.id} options={MATERIAL_OPTIONS} onChange={selectMaterial} />
          </ControlGroup>

          {material.surface === "holotype" ? (
            <>
              <ControlGroup label="HoloType preset">
                <Segmented
                  label="HoloType preset"
                  value={String(holoValues.preset ?? "platinum")}
                  options={HOLO_PRESET_OPTIONS}
                  onChange={(presetId) => {
                    const preset = HOLO_PRESETS.find((entry) => entry.id === presetId);
                    if (!preset) return;
                    updateParams({
                      preset: presetId,
                      spectral: preset.settings.spectral,
                      metallic: preset.settings.metallic,
                      grain: preset.settings.grain,
                      speed: preset.settings.speed,
                      pointer: preset.settings.pointer,
                      animated: preset.settings.animated,
                    });
                  }}
                />
              </ControlGroup>
              <ControlGroup label="Surface tone">
                <Segmented
                  label="Surface tone"
                  value={String(holoValues.tone ?? "dark") === "light" ? "light" : "dark"}
                  options={TONE_OPTIONS}
                  onChange={(tone) => updateParams({ tone })}
                />
              </ControlGroup>
              <Slider
                label="Spectral intensity"
                value={Number(holoValues.spectral ?? 0.4)}
                format={(value) => `${Math.round(value * 100)}%`}
                onChange={(spectral) => updateParams({ spectral })}
              />
              <Slider
                label="Sweep speed"
                value={Number(holoValues.speed ?? 0.45)}
                min={0}
                max={1.6}
                format={(value) => `${value.toFixed(2)}×`}
                onChange={(speed) => updateParams({ speed })}
              />
            </>
          ) : (
            <>
              <ControlGroup label="Paper preset">
                <Segmented
                  label="Paper preset"
                  value={String(paperValues.preset ?? "default")}
                  options={PAPER_PRESET_OPTIONS}
                  onChange={(preset) => updateParams({ preset })}
                />
              </ControlGroup>
              <Slider
                label="Shader speed"
                value={Number(paperValues.speed ?? 0.35)}
                min={0}
                max={2}
                format={(value) => `${value.toFixed(2)}×`}
                onChange={(speed) => updateParams({ speed })}
              />
              <Slider
                label="Distortion"
                value={Number(paperValues.distortion ?? 0.8)}
                min={0}
                max={2}
                format={(value) => value.toFixed(2)}
                onChange={(distortion) => updateParams({ distortion })}
              />
              <Slider
                label="Swirl"
                value={Number(paperValues.swirl ?? 0.1)}
                min={0}
                max={1.5}
                format={(value) => value.toFixed(2)}
                onChange={(swirl) => updateParams({ swirl })}
              />
            </>
          )}

          <ControlGroup label="Playback" hint={paused ? "paused" : "running"}>
            <Toggle label="Pause material" checked={paused} onChange={setPaused} />
          </ControlGroup>
          <ControlGroup label="Reduced motion" hint={prefersReduced ? "OS prefers reduce" : "OS preference: no-preference"}>
            <Toggle label="Force reduced motion" checked={forceReduced} onChange={setForceReduced} />
          </ControlGroup>
        </div>
        <div className={styles.controlFoot}>
          <button type="button" className={styles.reset} onClick={reset} data-testid="reset">
            Reset to preset A
          </button>
          <span className={styles.effectiveState} data-testid="effective-state">
            {reducedMotion ? "REDUCED" : paused ? "PAUSED" : "ANIMATED"}
          </span>
          <ValidationLine issues={issues} />
        </div>
      </div>

      <section className={styles.capabilities} aria-label="Capability information">
        <div className={styles.capabilityHead}>
          <span>Capability / observed</span>
          <span>{material.effect.version}</span>
        </div>
        <dl className={styles.spec}>
          <div>
            <dt>Mask</dt>
            <dd>
              <code>{mask.id}@{mask.version}</code>
            </dd>
          </div>
          <div>
            <dt>Coordinates</dt>
            <dd>
              <code>viewBox=&quot;{maskViewBox(mask)}&quot;</code>
            </dd>
          </div>
          <div>
            <dt>Fit / align</dt>
            <dd>{mask.fit} · {mask.align} · aspect {mask.aspectRatio.toFixed(3)}</dd>
          </div>
          <div>
            <dt>Material</dt>
            <dd>
              <code>{material.effect.id}@{material.effect.version}</code>
            </dd>
          </div>
          <div>
            <dt>Renderer</dt>
            <dd>{material.effect.technology} · {material.effect.status}</dd>
          </div>
          <div>
            <dt>Mask mechanism</dt>
            <dd>{material.mask.mechanism} · {material.mask.clipping}</dd>
          </div>
          <div>
            <dt>Mask source</dt>
            <dd data-testid="mask-source">
              {maskImage.status === "ready"
                ? `${maskImage.image.source} · ${maskImage.image.width}×${maskImage.image.height}`
                : maskImage.status}
            </dd>
          </div>
          {maskImage.status === "ready" && maskImage.image.font ? (
            <div>
              <dt>Wordmark font</dt>
              <dd data-testid="font-state">
                {maskImage.image.font.variablePresent ? "Space Grotesk variable" : "fallback"} ·{" "}
                {maskImage.image.font.loaded ? "loaded" : "not confirmed"} · weight {maskImage.image.font.weight}
              </dd>
            </div>
          ) : null}
          <div>
            <dt>Compatibility</dt>
            <dd data-testid="compatibility">
              {validation.ok ? validation.value.compatibility.message : "REJECTED"}
            </dd>
          </div>
          <div>
            <dt>Export</dt>
            <dd>{material.exportCapability}</dd>
          </div>
          <div>
            <dt>License</dt>
            <dd>{material.effect.license.spdx} · {material.effect.license.redistribution}</dd>
          </div>
        </dl>
        <p className={styles.capabilityNote}>{material.mask.note}</p>
        <ul className={styles.gapList}>
          {material.knownGaps.map((gap) => (
            <li key={gap}>{gap}</li>
          ))}
        </ul>
      </section>

      <div className={styles.maskReference} aria-hidden="true">
        {maskImage.status === "ready" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            data-testid="mask-reference"
            src={maskImage.image.url}
            alt=""
            data-mask-kind={mask.kind}
            data-mask-source={maskImage.image.source}
            data-mask-width={maskImage.image.width}
            data-mask-height={maskImage.image.height}
            data-font-family={maskImage.image.font?.family ?? ""}
            data-font-variable={maskImage.image.font?.variablePresent ? "true" : "false"}
            data-font-loaded={maskImage.image.font?.loaded ? "true" : "false"}
          />
        ) : null}
      </div>
    </div>
  );
}
