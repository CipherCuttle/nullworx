"use client";

import { useEffect, useState } from "react";
import { MeshGradient, meshGradientPresets } from "@paper-design/shaders-react";
import { paperMeshEffect } from "@/lib/effects/definitions";
import type { PaperParams } from "@/lib/effects/schemas";
import { usePrefersReducedMotion } from "@/lib/effects/use-prefers-reduced-motion";
import { validateEffectParams } from "@/lib/effects/validate";
import { Labeled, Segmented, Slider, Toggle, ValidationLine } from "./controls";
import styles from "./paper-mesh-preview.module.css";

const presetOptions = [
  { value: "default" as const, label: "Default" },
  { value: "purple" as const, label: "Purple" },
  { value: "beach" as const, label: "Beach" },
  { value: "ink" as const, label: "Ink" },
];

function initialParams(): PaperParams {
  const result = validateEffectParams(paperMeshEffect, paperMeshEffect.defaults);
  if (!result.ok) {
    throw new Error(`Paper defaults failed validation: ${result.issues.join("; ")}`);
  }
  return result.data;
}

function upstreamPreset(id: PaperParams["preset"]) {
  const match = meshGradientPresets.find((preset) => preset.name.toLowerCase() === id);
  return match ?? meshGradientPresets[0];
}

export default function PaperMeshPreview() {
  const [params, setParams] = useState<PaperParams>(initialParams);
  const [issues, setIssues] = useState<string | null>(null);
  const [webgl, setWebgl] = useState<"checking" | "ready" | "unsupported">("checking");
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    try {
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2");
      if (!gl) {
        setWebgl("unsupported");
        return;
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      setWebgl("ready");
    } catch {
      setWebgl("unsupported");
    }
  }, []);

  function update(patch: Partial<PaperParams>) {
    const result = validateEffectParams(paperMeshEffect, { ...params, ...patch });
    if (!result.ok) {
      setIssues(result.issues.join("; "));
      return;
    }
    setParams(result.data);
    setIssues(null);
  }

  const preset = upstreamPreset(params.preset);
  const effectiveSpeed = prefersReduced || params.paused ? 0 : params.speed;
  const reduced = prefersReduced || params.paused;

  return (
    <div className={styles.preview} data-testid="paper-adapter">
      <section
        className={styles.stage}
        data-testid="paper-mesh-preview"
        data-reduced={prefersReduced ? "true" : "false"}
        data-paused={params.paused ? "true" : "false"}
        data-webgl={webgl}
        aria-label="Paper Shaders Mesh Gradient preview"
      >
        <div className={styles.shader} aria-hidden="true">
          {webgl === "ready" ? (
            <MeshGradient
              colors={preset.params.colors}
              speed={effectiveSpeed}
              distortion={params.distortion}
              swirl={params.swirl}
              minPixelRatio={1}
              maxPixelCount={paperMeshEffect.capabilities.maxPixelCount}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <div className={styles.fallback}>
              {webgl === "checking" ? "Checking WebGL2…" : "WebGL2 unavailable — no shader mounted."}
            </div>
          )}
        </div>
        <div className={styles.overlay}>
          <div className={styles.stageMeta}>
            <span>THIRD-PARTY EFFECT</span>
            <span>PAPER SHADERS 0.0.82</span>
            <span className={styles.license}>APACHE-2.0</span>
          </div>
          <div className={styles.card}>
            <p className={styles.eyebrow}>UPSTREAM PACKAGE / DIRECT IMPORT</p>
            <h3>Mesh Gradient</h3>
            <p>
              The shader is mounted directly from <code>@paper-design/shaders-react</code>. The adapter adds
              presets, a runtime validator, a render-pixel ceiling and reduced-motion speed only.
            </p>
            <div className={styles.stageFacts}>
              <span>{webgl === "ready" ? "WEBGL2 LIVE" : webgl.toUpperCase()}</span>
              <span>{prefersReduced ? "REDUCED MOTION → SPEED 0" : params.paused ? "PAUSED → SPEED 0" : `SPEED ${effectiveSpeed.toFixed(2)}`}</span>
              <span>MAX {paperMeshEffect.capabilities.maxPixelCount?.toLocaleString("en-US")} PX</span>
            </div>
          </div>
        </div>
      </section>

      <div className={styles.controls} aria-label="Paper Shaders adapter controls">
        <Labeled label="Upstream preset">
          <Segmented label="Paper preset" value={params.preset} options={presetOptions} onChange={(value) => update({ preset: value })} />
        </Labeled>
        <Labeled label="Playback">
          <Toggle label="Pause shader" checked={params.paused} onChange={(paused) => update({ paused })} />
        </Labeled>
        <Labeled label="Reduced motion" hint={prefersReduced ? "active: speed 0" : "OS preference: no-preference"}>
          <span className={styles.reducedState}>{reduced ? "Static frame" : "Animating"}</span>
        </Labeled>
        <Slider
          label="Speed"
          value={params.speed}
          min={0}
          max={2}
          step={0.01}
          format={(value) => `${value.toFixed(2)}×`}
          onChange={(speed) => update({ speed })}
        />
        <Slider
          label="Distortion"
          value={params.distortion}
          min={0}
          max={2}
          step={0.01}
          format={(value) => value.toFixed(2)}
          onChange={(distortion) => update({ distortion })}
        />
        <Slider
          label="Swirl"
          value={params.swirl}
          min={0}
          max={1.5}
          step={0.01}
          format={(value) => value.toFixed(2)}
          onChange={(swirl) => update({ swirl })}
        />
        <div className={styles.validationSlot}>
          <ValidationLine issues={issues} />
        </div>
      </div>
    </div>
  );
}
