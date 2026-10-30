"use client";

import { useEffect, useMemo, useState } from "react";
import { MeshGradient, meshGradientPresets } from "@paper-design/shaders-react";
import { paperMeshEffect } from "@/lib/labs/effects";
import { cssMaskUrl, type MaskImage } from "@/lib/composition/mask-image";
import styles from "../composition-lab.module.css";
import type { CompositionSurfaceProps } from "./types";

function upstreamPreset(id: "default" | "purple" | "beach" | "ink") {
  const match = meshGradientPresets.find((preset) => preset.name.toLowerCase() === id);
  return match ?? meshGradientPresets[0];
}

export function PaperSurface({ mask, maskImage, params, paused, reducedMotion }: CompositionSurfaceProps) {
  const [webgl, setWebgl] = useState<"checking" | "ready" | "unsupported">("checking");
  const parsed = useMemo(() => paperMeshEffect.params.safeParse(params), [params]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const probe = document.createElement("canvas");
        const context = probe.getContext("webgl2");
        if (!context) {
          setWebgl("unsupported");
          return;
        }
        context.getExtension("WEBGL_lose_context")?.loseContext();
        setWebgl("ready");
      } catch {
        setWebgl("unsupported");
      }
    });
    return () => { cancelled = true; };
  }, []);

  if (!parsed.success) {
    return (
      <div className={styles.surfaceError} role="alert" data-testid="surface-error">
        Paper MeshGradient rejected the composition params:{" "}
        {parsed.error.issues.map((issue) => issue.message).join("; ")}
      </div>
    );
  }

  if (maskImage.status === "error") {
    return (
      <div className={styles.surfaceError} role="alert" data-testid="surface-error">
        Mask unavailable: {maskImage.message}
      </div>
    );
  }

  if (webgl === "unsupported") {
    return (
      <div className={styles.surfaceFallback} role="status" data-testid="webgl-fallback">
        WebGL2 is unavailable. The Paper material is not mounted and the mask is not
        substituted with a static gradient.
      </div>
    );
  }

  const values = parsed.data;
  const image: MaskImage | null = maskImage.status === "ready" ? maskImage.image : null;
  const preset = upstreamPreset(values.preset);
  const speed = paused || reducedMotion || values.paused ? 0 : values.speed;

  return (
    <div
      className={styles.paperStage}
      data-surface="paper"
      data-mask-kind={mask.kind}
      data-mask-source={image?.source ?? "loading"}
      data-mask-ready={image ? "true" : "false"}
      data-paused={paused ? "true" : "false"}
      data-reduced={reducedMotion ? "true" : "false"}
      data-webgl={webgl}
    >
      <div
        className={styles.paperMask}
        style={
          image
            ? { maskImage: cssMaskUrl(image), WebkitMaskImage: cssMaskUrl(image) }
            : { visibility: "hidden" }
        }
      >
        {webgl === "ready" ? (
          <MeshGradient
            colors={preset.params.colors}
            speed={speed}
            distortion={values.distortion}
            swirl={values.swirl}
            minPixelRatio={1}
            maxPixelCount={paperMeshEffect.capabilities.maxPixelCount}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div className={styles.maskLoading} role="status">
            Checking WebGL2…
          </div>
        )}
      </div>
      {image ? null : (
        <div className={styles.maskOverlay} role="status" data-testid="mask-loading">
          Rasterizing {mask.geometry.kind === "text" ? mask.geometry.text : mask.title} mask…
        </div>
      )}
    </div>
  );
}
