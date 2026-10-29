"use client";

import { useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { motionBehaviorEffect } from "@/lib/effects/definitions";
import type { MotionParams } from "@/lib/effects/schemas";
import { validateEffectParams } from "@/lib/effects/validate";
import { Labeled, Segmented, Slider, ValidationLine } from "./controls";
import styles from "./motion-behavior-preview.module.css";

const MODES = [
  {
    id: "scan" as const,
    label: "Scan",
    index: "01",
    title: "Continuous signal",
    metric: "2.4 s",
    copy: "A restrained pulse marks a live channel. Motion runs only while this state is visible.",
  },
  {
    id: "hold" as const,
    label: "Hold",
    index: "02",
    title: "Held sample",
    metric: "0.0",
    copy: "The pulse stops. The layout indicator still moves between channels with a spring.",
  },
  {
    id: "release" as const,
    label: "Release",
    index: "03",
    title: "Released channel",
    metric: "—",
    copy: "Content leaves and re-enters through AnimatePresence. Reduced motion collapses both transitions.",
  },
];

const modeOptions = MODES.map((mode) => ({ value: mode.id, label: mode.label }));

function initialParams(): MotionParams {
  const result = validateEffectParams(motionBehaviorEffect, motionBehaviorEffect.defaults);
  if (!result.ok) {
    throw new Error(`Motion defaults failed validation: ${result.issues.join("; ")}`);
  }
  return result.data;
}

export default function MotionBehaviorPreview() {
  const [params, setParams] = useState<MotionParams>(initialParams);
  const [issues, setIssues] = useState<string | null>(null);
  const reduce = Boolean(useReducedMotion());

  function update(patch: Partial<MotionParams>) {
    const result = validateEffectParams(motionBehaviorEffect, { ...params, ...patch });
    if (!result.ok) {
      setIssues(result.issues.join("; "));
      return;
    }
    setParams(result.data);
    setIssues(null);
  }

  const active = MODES.find((mode) => mode.id === params.mode) ?? MODES[0];
  const spring = reduce
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 320, damping: 30, mass: 0.7 };
  const style = { "--motion-intensity": params.intensity } as CSSProperties;

  return (
    <div className={styles.preview} data-testid="motion-adapter">
      <section
        className={styles.stage}
        data-testid="motion-behavior-preview"
        data-reduced={reduce ? "true" : "false"}
        data-mode={params.mode}
        style={style}
        aria-label="Motion signal behavior preview"
      >
        <div className={styles.stageMeta}>
          <span>THIRD-PARTY BEHAVIOR</span>
          <span>MOTION 14.7.1</span>
          <span className={styles.license}>MIT</span>
        </div>

        <div className={styles.board}>
          <div className={styles.rail} role="group" aria-label="Signal mode">
            {MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={styles.mode}
                aria-pressed={params.mode === mode.id}
                onClick={() => update({ mode: mode.id })}
              >
                {params.mode === mode.id ? (
                  <motion.span
                    layoutId="motion-mode-indicator"
                    className={styles.indicator}
                    transition={spring}
                    aria-hidden="true"
                  />
                ) : null}
                <span className={styles.modeIndex}>{mode.index}</span>
                <span className={styles.modeLabel}>{mode.label}</span>
              </button>
            ))}
          </div>

          <div className={styles.content}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${params.mode}-${params.replay}`}
                className={styles.card}
                initial={{ opacity: 0, y: reduce ? 0 : 14, scale: reduce ? 1 : 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: reduce ? 0 : -10, scale: reduce ? 1 : 0.99 }}
                transition={spring}
              >
                <div className={styles.cardHead}>
                  <span className={styles.cardIndex}>CHANNEL / {active.index}</span>
                  <span className={styles.cardMetric}>{active.metric}</span>
                </div>
                <h3>{active.title}</h3>
                <p>{active.copy}</p>
                <div className={styles.meter} aria-hidden="true">
                  <motion.span
                    className={styles.meterFill}
                    animate={{ scaleX: Math.max(0.08, params.intensity * (params.mode === "scan" ? 1 : 0.62)) }}
                    transition={spring}
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className={styles.stageFoot}>
          <span className={styles.pulseWrap}>
            <motion.span
              className={styles.pulse}
              data-motion-pulse=""
              animate={
                reduce || params.mode !== "scan"
                  ? { opacity: 1, scale: 1 }
                  : { opacity: [0.3, 1, 0.3], scale: [0.82, 1.08, 0.82] }
              }
              transition={
                reduce || params.mode !== "scan"
                  ? { duration: 0 }
                  : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
              }
              aria-hidden="true"
            />
            {reduce ? "REDUCED MOTION" : params.mode === "scan" ? "LIVE PULSE" : "STATIC"}
          </span>
          <span>{reduce ? "transitions: 0 ms" : "spring transitions"}</span>
          <span>{Math.round(params.intensity * 100)}% intensity</span>
        </div>
      </section>

      <div className={styles.controls} aria-label="Motion adapter controls">
        <Labeled label="Signal mode">
          <Segmented label="Signal mode" value={params.mode} options={modeOptions} onChange={(mode) => update({ mode })} />
        </Labeled>
        <Labeled label="Reduced motion" hint={reduce ? "OS preference: reduce" : "OS preference: no-preference"}>
          <span className={styles.reducedState}>{reduce ? "Transitions disabled" : "Spring animation"}</span>
        </Labeled>
        <div className={styles.replaySlot}>
          <button type="button" className={styles.replay} onClick={() => update({ replay: params.replay + 1 })}>
            Replay entry
          </button>
        </div>
        <Slider
          label="Signal intensity"
          value={params.intensity}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(intensity) => update({ intensity })}
        />
        <div className={styles.validationSlot}>
          <ValidationLine issues={issues} />
        </div>
      </div>
    </div>
  );
}
