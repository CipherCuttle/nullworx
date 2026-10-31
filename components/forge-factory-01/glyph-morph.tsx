"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";
import styles from "./glyph-morph.module.css";

const DEFAULT_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+<>*";
export type GlyphMorphProps = {
  text: string;
  durationMs?: number;
  frameMs?: number;
  alphabet?: string;
  seed?: number;
  paused?: boolean;
  className?: string;
};

/** Glyphs are cosmetic. The original text is always available to assistive technology. */
export function GlyphMorph({
  text, durationMs = 840, frameMs = 38, alphabet = DEFAULT_ALPHABET,
  seed = 17, paused = false, className,
}: GlyphMorphProps) {
  const reducedMotion = useReducedMotion();
  const [rendered, setRendered] = useState(text);
  useEffect(() => {
    if (reducedMotion || paused || !text || !alphabet) return;
    const target = Array.from(text);
    const tokens = Array.from(alphabet);
    const safeFrame = Math.max(20, Math.min(160, Math.floor(frameMs)));
    const totalFrames = Math.max(1, Math.ceil(Math.max(0, Math.min(durationMs, 5000)) / safeFrame));
    let frame = 0;
    const draw = () => {
      frame += 1;
      const progress = frame / totalFrames;
      setRendered(target.map((char, i) => {
        if (char.trim() === "" || (i / Math.max(1, target.length)) < progress) return char;
        const index = Math.abs((Math.imul((seed | 0) + i * 53 + frame * 97, 2654435761) ^ (frame * 7919))) % tokens.length;
        return tokens[index] ?? char;
      }).join(""));
    };
    draw();
    const timer = window.setInterval(() => {
      if (frame >= totalFrames) {
        window.clearInterval(timer);
        setRendered(text);
      } else draw();
    }, safeFrame);
    return () => window.clearInterval(timer);
  }, [text, durationMs, frameMs, alphabet, seed, paused, reducedMotion]);
  const visible = reducedMotion || paused ? text : rendered;
  return (
    <span className={[styles.morph, className].filter(Boolean).join(" ")} data-effect="glyph-morph">
      <span aria-hidden="true" data-testid="glyph-morph-visible">{visible}</span>
      <span className={styles.screenReader}>{text}</span>
    </span>
  );
}
