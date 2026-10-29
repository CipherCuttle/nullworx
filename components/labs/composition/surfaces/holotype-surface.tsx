"use client";

import { HoloGlyph, HoloText } from "@/experiments/holotype";
import { holotypeEffect } from "@/lib/effects";
import { maskViewBox } from "@/lib/composition";
import styles from "../composition-lab.module.css";
import type { CompositionSurfaceProps } from "./types";
import { useTextFit } from "./use-text-fit";

export function HolotypeSurface({ mask, params, paused, reducedMotion }: CompositionSurfaceProps) {
  const fit = useTextFit(mask);
  const parsed = holotypeEffect.params.safeParse(params);

  if (!parsed.success) {
    return (
      <div className={styles.surfaceError} role="alert" data-testid="surface-error">
        HoloType rejected the composition params: {parsed.error.issues.map((issue) => issue.message).join("; ")}
      </div>
    );
  }

  const values = parsed.data;
  const animated = values.animated && !paused && !reducedMotion;
  const motion = reducedMotion ? "reduced" : values.motion;
  const settings = {
    spectral: values.spectral,
    metallic: values.metallic,
    grain: values.grain,
    speed: values.speed,
    pointer: values.pointer,
    animated,
  };

  return (
    <div
      ref={fit.ref}
      className={styles.holotypeSurface}
      data-surface="holotype"
      data-mask-kind={mask.kind}
      data-paused={paused ? "true" : "false"}
      data-reduced={reducedMotion ? "true" : "false"}
      data-animated={animated ? "true" : "false"}
    >
      {mask.geometry.kind === "text" ? (
        <HoloText
          as="span"
          variant="display"
          className={styles.holotypeText}
          preset={values.preset}
          tone={values.tone}
          motion={motion}
          settings={settings}
          style={{
            fontFamily: mask.geometry.font.cssFamily,
            fontWeight: mask.geometry.font.weight,
            letterSpacing: 0,
            lineHeight: 1,
            ...(fit.fontSize > 0 ? { fontSize: `${fit.fontSize}px` } : null),
          }}
        >
          {mask.geometry.text}
        </HoloText>
      ) : (
        <HoloGlyph
          label={`${mask.title} filled with HoloType`}
          className={styles.holotypeGlyph}
          viewBox={maskViewBox(mask)}
          paths={mask.geometry.paths}
          strokes={mask.geometry.strokes}
          strokeWidth={mask.geometry.strokeWidth}
          preset={values.preset}
          tone={values.tone}
          motion={motion}
          settings={settings}
        />
      )}
    </div>
  );
}
