"use client";

import { useEffect, useRef, useState } from "react";
import {
  PearlCaustics,
  PEARL_CAUSTICS_PRESETS,
  PEARL_LOOP_SECONDS,
  type PearlCausticsPreset,
  type PearlCausticsSurface,
} from "@/experiments/pearl-caustics/PearlCaustics";
import { usePrefersReducedMotion } from "@/lib/labs/effects/use-prefers-reduced-motion";
import { ControlGroup, Segmented, Slider, Toggle } from "./controls";
import chrome from "./preview-chrome.module.css";
import styles from "./pearl-preview.module.css";

type RenderState = "webgl" | "software-still" | "fallback";

const presetOptions = PEARL_CAUSTICS_PRESETS.map((preset) => ({
  value: preset.id,
  label: preset.label,
  title: preset.note,
}));

export default function PearlPreview() {
  const [preset, setPreset] = useState<PearlCausticsPreset>("pearl-wash");
  const [surface, setSurface] = useState<PearlCausticsSurface>("plaster");
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [intensity, setIntensity] = useState(0.88);
  const [spectral, setSpectral] = useState(0.36);
  const [nacre, setNacre] = useState(0.58);
  const [renderState, setRenderState] = useState<RenderState | "checking">("checking");
  const pearlRef = useRef<HTMLDivElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  // The preserved component deletes its GL objects but does not force the
  // driver to release the context. The site wrapper releases it explicitly on
  // unmount so repeated route changes cannot accumulate contexts.
  useEffect(() => {
    const root = pearlRef.current;
    return () => {
      const canvas = root?.querySelector("canvas");
      const gl = canvas?.getContext("webgl") ?? canvas?.getContext("webgl2");
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);
  const active = PEARL_CAUSTICS_PRESETS.find((entry) => entry.id === preset) ?? PEARL_CAUSTICS_PRESETS[0];

  function choosePreset(next: PearlCausticsPreset) {
    const definition = PEARL_CAUSTICS_PRESETS.find((entry) => entry.id === next);
    setPreset(next);
    if (!definition) return;
    setSpeed(definition.tuning.speed);
    setIntensity(definition.tuning.intensity);
    setSpectral(definition.tuning.spectral);
    setNacre(definition.tuning.nacre);
  }

  const still = paused || prefersReduced;
  const stateCopy =
    renderState === "webgl"
      ? still
        ? "STILL FRAME"
        : `LIVE / ${PEARL_LOOP_SECONDS.toFixed(1)} S LOOP`
      : renderState === "software-still"
        ? "SOFTWARE STILL"
        : renderState === "fallback"
          ? "FALLBACK"
          : "PROBING WEBGL";

  return (
    <div className={chrome.preview} data-testid="pearl-adapter">
      <section
        className={styles.stage}
        data-testid="pearl-preview"
        data-preset={preset}
        data-surface={surface}
        data-paused={paused ? "true" : "false"}
        data-reduced={prefersReduced ? "true" : "false"}
        data-render-state={renderState}
        aria-label="Pearl Caustics preview"
      >
        <PearlCaustics
          ref={pearlRef}
          preset={preset}
          surface={surface}
          speed={speed}
          intensity={intensity}
          spectral={spectral}
          nacre={nacre}
          paused={still}
          motion={prefersReduced ? "reduced" : "auto"}
          onRenderStateChange={setRenderState}
        />
        <div className={chrome.stageMeta}>
          <span>Existing material / WebGL caustics</span>
          <span>Pearl Caustics V2</span>
          <span>{active.label}</span>
        </div>
        <div className={styles.stageCopy}>
          <strong>Light, folded through water.</strong>
          <p>
            A deterministic 12-second ambient loop. The pointer is a transient layer and never
            writes the clock; pause holds the phase instead of resetting it.
          </p>
        </div>
        <div className={chrome.stageFoot}>
          <span>{stateCopy}</span>
          <span>{prefersReduced ? "OS REDUCED / STILL" : paused ? "PAUSED / PHASE HELD" : "12.0 S PERIOD"}</span>
          <span>{surface === "plaster" ? "PLASTER" : "DUSK"}</span>
        </div>
      </section>

      <div className={chrome.controls}>
        <div className={chrome.controlsHead}>
          <span>Caustic controls</span>
          <small>Renderer source is unchanged</small>
        </div>
        <div className={chrome.controlGrid}>
          <ControlGroup label="Preset">
            <Segmented label="Pearl preset" value={preset} options={presetOptions} onChange={choosePreset} />
          </ControlGroup>
          <ControlGroup label="Surface">
            <Segmented
              label="Pearl surface"
              value={surface}
              options={[
                { value: "plaster", label: "Plaster" },
                { value: "dusk", label: "Dusk" },
              ]}
              onChange={setSurface}
            />
          </ControlGroup>
          <ControlGroup label="Playback">
            <Toggle label="Pause caustics" checked={paused} onChange={setPaused} />
          </ControlGroup>
          <Slider label="Speed" value={speed} min={0.2} max={2} format={(v) => `${v.toFixed(2)}×`} onChange={setSpeed} />
          <Slider label="Intensity" value={intensity} format={(v) => `${Math.round(v * 100)}%`} onChange={setIntensity} />
          <Slider label="Spectral" value={spectral} format={(v) => `${Math.round(v * 100)}%`} onChange={setSpectral} />
          <Slider label="Nacre" value={nacre} format={(v) => `${Math.round(v * 100)}%`} onChange={setNacre} />
        </div>
        <p className={chrome.controlsFoot} role="status" aria-live="polite">
          {renderState === "webgl"
            ? "Hardware/ANGLE WebGL 1 field. The source proof measured 144 fps on a 143.88 Hz panel."
            : renderState === "software-still"
              ? "Software rasteriser detected. The material holds a single truthful still instead of animating at a false frame rate."
              : renderState === "fallback"
                ? "WebGL is unavailable or the context was lost. The CSS fallback remains and controls are not claimed as live."
                : "Probing the renderer."}
        </p>
      </div>
    </div>
  );
}
