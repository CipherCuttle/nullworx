"use client";

import { useEffect, useState } from "react";
import { MeshGradient, meshGradientPresets } from "@paper-design/shaders-react";
import { paperMeshEffect } from "@/lib/labs/effects";
import type { PaperParams } from "@/lib/labs/effects/schemas";
import { usePrefersReducedMotion } from "@/lib/labs/effects/use-prefers-reduced-motion";
import { validateEffectParams } from "@/lib/labs/effects/validate";
import { ControlGroup, Segmented, Slider, Toggle } from "./controls";
import chrome from "./preview-chrome.module.css";
import styles from "./paper-mesh-preview.module.css";

const presetOptions = [
  { value: "default" as const, label: "Default" },
  { value: "purple" as const, label: "Purple" },
  { value: "beach" as const, label: "Beach" },
  { value: "ink" as const, label: "Ink" },
];

function initialParams(): PaperParams {
  const result = validateEffectParams(paperMeshEffect, paperMeshEffect.defaults);
  if (!result.ok) throw new Error(`Paper defaults failed validation: ${result.issues.join("; ")}`);
  return result.data;
}

function upstreamPreset(id: PaperParams["preset"]) {
  return meshGradientPresets.find((preset) => preset.name.toLowerCase() === id) ?? meshGradientPresets[0];
}

export default function PaperMeshPreview() {
  const [params, setParams] = useState<PaperParams>(initialParams);
  const [issues, setIssues] = useState<string | null>(null);
  const [webgl, setWebgl] = useState<"checking" | "ready" | "unsupported">("checking");
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
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
    });
    return () => { cancelled = true; };
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
    <div className={chrome.preview} data-testid="paper-adapter">
      <section
        className={styles.stage}
        data-testid="paper-mesh-preview"
        data-reduced={prefersReduced ? "true" : "false"}
        data-paused={params.paused ? "true" : "false"}
        data-webgl={webgl}
        aria-label="Paper Shaders MeshGradient preview"
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
            <div className={chrome.fallback}>
              <strong>{webgl === "checking" ? "Checking WebGL 2" : "WebGL 2 unavailable"}</strong>
              <span>
                {webgl === "checking"
                  ? "Probing for a live context before mounting the upstream shader."
                  : "The upstream shader is not mounted. No static gradient is substituted."}
              </span>
            </div>
          )}
        </div>
        <div className={chrome.stageMeta}>
          <span>Third-party material / direct import</span>
          <span>Paper Shaders 0.0.82</span>
          <span>Apache-2.0</span>
        </div>
        <div className={chrome.overlay}>
          <strong>{preset.name}</strong>
          <p>
            The canvas is upstream. This adapter owns presets, the validated parameter set, the
            render-pixel ceiling and the explicit static state only.
          </p>
        </div>
        <div className={chrome.stageFoot}>
          <span>{webgl === "ready" ? "WEBGL 2" : webgl.toUpperCase()}</span>
          <span>{prefersReduced ? "OS REDUCED → SPEED 0" : params.paused ? "PAUSED → SPEED 0" : `SPEED ${effectiveSpeed.toFixed(2)}`}</span>
          <span>MAX {paperMeshEffect.capabilities.maxPixelCount?.toLocaleString("en-US")} PX</span>
        </div>
      </section>

      <div className={chrome.controls}>
        <div className={chrome.controlsHead}>
          <span>Upstream controls</span>
          <small>No shader source is vendored or edited</small>
        </div>
        <div className={chrome.controlGrid}>
          <ControlGroup label="Preset">
            <Segmented label="Paper preset" value={params.preset} options={presetOptions} onChange={(preset) => update({ preset })} />
          </ControlGroup>
          <ControlGroup label="Playback" hint={prefersReduced ? "OS reduced motion is active" : "Explicit pause is separate"}>
            <Toggle label="Pause shader" checked={params.paused} onChange={(paused) => update({ paused })} />
          </ControlGroup>
          <Slider label="Speed" value={params.speed} min={0} max={2} format={(v) => `${v.toFixed(2)}×`} onChange={(speed) => update({ speed })} />
          <Slider label="Distortion" value={params.distortion} min={0} max={2} format={(v) => v.toFixed(2)} onChange={(distortion) => update({ distortion })} />
          <Slider label="Swirl" value={params.swirl} min={0} max={1.5} format={(v) => v.toFixed(2)} onChange={(swirl) => update({ swirl })} />
        </div>
        <p className={chrome.controlsFoot} role="status" aria-live="polite">
          {issues ?? (reduced
            ? "Static frame. The shader is stopped at speed 0; the material's last frame remains visible."
            : `Animating at ${effectiveSpeed.toFixed(2)}×. Reduced motion or pause stops the shader without remounting it.`)}
        </p>
      </div>
    </div>
  );
}
