"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { resolvePageFont } from "@/lib/composition/mask-image";
import type { MaskDefinition } from "@/lib/composition";

/**
 * Fit the native DOM wordmark to the same fraction of its box that the canvas
 * wordmark mask uses. This is text fitting for the material, not a renderer
 * branch: vector masks do not use it.
 */
export function useTextFit(mask: MaskDefinition): { containerRef: RefObject<HTMLDivElement | null>; fontSize: number } {
  const ref = useRef<HTMLDivElement | null>(null);
  const [fontSize, setFontSize] = useState(0);

  useEffect(() => {
    const geometry = mask.geometry;
    if (geometry.kind !== "text") return;
    const element = ref.current;
    if (!element) return;

    let cancelled = false;
    let frame = 0;

    const measure = async () => {
      const font = await resolvePageFont(mask);
      if (cancelled || !element.isConnected) return;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return;

      const base = 100;
      context.font = `${geometry.font.weight} ${base}px ${font.stack}`;
      const measured = context.measureText(geometry.text).width || 1;
      const available = element.clientWidth * geometry.font.fit;
      const next = available / (measured / base);
      if (!cancelled) setFontSize(Number.isFinite(next) && next > 0 ? Math.round(next) : 0);
    };

    void measure();
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => void measure());
    });
    observer.observe(element);

    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [mask]);

  return { containerRef: ref, fontSize };
}
