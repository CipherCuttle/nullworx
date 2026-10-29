"use client";

/**
 * Wordmark rasterization and cache identity for Living Type 01.
 *
 * The mask key is content-addressed. It includes the text, the pinned font
 * family/version, weight, fit, tracking, frame ratio, raster dimensions and
 * effective device pixel ratio. It never depends on a component id alone.
 */

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  LIVING_TYPE_FONT_FAMILY,
  LIVING_TYPE_FONT_VERSION,
} from "./living-type-recipe";

export const MASK_ALGORITHM_VERSION = "1";
export const FONT_PROBE = "Aa0";
export const FONT_TIMEOUT_MS = 1800;
export const MASK_DEBOUNCE_MS = 90;
export const MAX_RASTER_WIDTH = 4096;
export const MIN_RASTER_WIDTH = 160;

export type FontStatus = "loading" | "loaded" | "fallback";

export interface FontState {
  status: FontStatus;
  family: typeof LIVING_TYPE_FONT_FAMILY;
  version: typeof LIVING_TYPE_FONT_VERSION;
}

export interface MaskRequest {
  text: string;
  weight: number;
  fit: number;
  tracking: number;
  aspect: number;
  rasterWidth: number;
  rasterHeight: number;
  pixelRatio: number;
  fontStatus: Exclude<FontStatus, "loading">;
  fontFamily: typeof LIVING_TYPE_FONT_FAMILY;
  fontVersion: typeof LIVING_TYPE_FONT_VERSION;
}

export interface RasterizedMask {
  blob: Blob;
  width: number;
  height: number;
  fontStatus: Exclude<FontStatus, "loading">;
  engine: "canvas-letter-spacing" | "canvas-manual-tracking";
}

export type LivingTypeMaskState =
  | { status: "pending" }
  | {
      status: "ready";
      key: string;
      url: string;
      width: number;
      height: number;
      fontStatus: Exclude<FontStatus, "loading">;
      engine: RasterizedMask["engine"];
    }
  | { status: "error"; key: string; message: string };

const FALLBACK_STACK = "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif";
const MAX_RASTER_HEIGHT = 4096;

export function fontStack(fontStatus: FontStatus): string {
  return fontStatus === "loaded"
    ? `"${LIVING_TYPE_FONT_FAMILY}", ${FALLBACK_STACK}`
    : FALLBACK_STACK;
}

export function maskCacheKey(request: MaskRequest): string {
  return JSON.stringify([
    MASK_ALGORITHM_VERSION,
    request.text,
    request.fontFamily,
    request.fontVersion,
    request.weight,
    request.fit,
    request.tracking,
    request.aspect,
    request.rasterWidth,
    request.rasterHeight,
    request.pixelRatio,
    request.fontStatus,
  ]);
}

/** Stable short identifier for DOM receipts; not security-sensitive. */
export function shortHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function useLivingTypeFont(weight: number): FontState {
  const [state, setState] = useState<FontState>({
    status: "loading",
    family: LIVING_TYPE_FONT_FAMILY,
    version: LIVING_TYPE_FONT_VERSION,
  });
  const statusRef = useRef<FontStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    statusRef.current = "loading";
    setState((previous) => ({ ...previous, status: "loading" }));

    if (typeof document === "undefined" || !document.fonts) {
      statusRef.current = "fallback";
      setState((previous) => ({ ...previous, status: "fallback" }));
      return;
    }

    const fontSet = document.fonts;
    const probe = `${weight} 100px "${LIVING_TYPE_FONT_FAMILY}"`;
    let timeout = 0;

    const update = (next: Exclude<FontStatus, "loading">) => {
      if (cancelled) return;
      // Never downgrade a loaded font because a later loading event failed.
      if (statusRef.current === "loaded" && next === "fallback") return;
      statusRef.current = next;
      setState((previous) =>
        previous.status === next ? previous : { ...previous, status: next },
      );
    };

    const detect = async () => {
      try {
        await fontSet.load(probe, FONT_PROBE);
      } catch {
        // A failed load means the declared fallback is used. Do not throw into
        // the render tree: the composition still has to be usable.
      }
      if (cancelled) return;
      let loaded = false;
      try {
        fontSet.forEach((face) => {
          const family = face.family.replace(/^['"]|['"]$/g, "");
          if (family === LIVING_TYPE_FONT_FAMILY && face.status === "loaded") {
            loaded = true;
          }
        });
      } catch {
        loaded = false;
      }
      update(loaded ? "loaded" : "fallback");
    };

    void detect();
    timeout = window.setTimeout(() => {
      if (statusRef.current === "loading") update("fallback");
    }, FONT_TIMEOUT_MS);

    const onLoadingDone = () => {
      // Upgrade fallback -> loaded if the font arrives late. Detect never
      // downgrades a loaded family.
      void detect();
    };
    fontSet.addEventListener("loadingdone", onLoadingDone);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      fontSet.removeEventListener("loadingdone", onLoadingDone);
    };
  }, [weight]);

  return state;
}

export interface StageBox {
  width: number;
  height: number;
  dpr: number;
}

function readStage(element: HTMLElement): StageBox {
  return {
    width: element.clientWidth,
    height: element.clientHeight,
    dpr: typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
  };
}

export interface UseLivingTypeMaskOptions {
  text: string;
  weight: number;
  fit: number;
  tracking: number;
  aspect: number;
  fontStatus: FontStatus;
}

export interface UseLivingTypeMaskResult {
  rootRef: RefObject<HTMLDivElement | null>;
  box: StageBox;
  request: MaskRequest | null;
  maskKey: string;
  mask: LivingTypeMaskState;
}

export function useLivingTypeMask({
  text,
  weight,
  fit,
  tracking,
  aspect,
  fontStatus,
}: UseLivingTypeMaskOptions): UseLivingTypeMaskResult {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<StageBox>({ width: 0, height: 0, dpr: 1 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const [entry, setEntry] = useState<{
    key: string;
    value: LivingTypeMaskState;
  } | null>(null);

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = readStage(element);
        setBox((previous) =>
          previous.width === next.width &&
          previous.height === next.height &&
          previous.dpr === next.dpr
            ? previous
            : next,
        );
      });
    };

    measure();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);

    let resolutionQuery: MediaQueryList | null = null;
    const listenForResolution = () => {
      resolutionQuery?.removeEventListener("change", onResolutionChange);
      if (typeof window.matchMedia !== "function") return;
      resolutionQuery = window.matchMedia(
        `(resolution: ${window.devicePixelRatio || 1}dppx)`,
      );
      resolutionQuery.addEventListener("change", onResolutionChange);
    };
    const onResolutionChange = () => {
      measure();
      listenForResolution();
    };
    listenForResolution();

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      resolutionQuery?.removeEventListener("change", onResolutionChange);
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  const request = useMemo<MaskRequest | null>(() => {
    if (box.width <= 0 || box.height <= 0 || fontStatus === "loading") return null;
    const pixelRatio = clamp(box.dpr || 1, 1, 2);
    const rasterWidth = clamp(
      Math.round(box.width * pixelRatio),
      MIN_RASTER_WIDTH,
      MAX_RASTER_WIDTH,
    );
    const rasterHeight = clamp(
      Math.round(rasterWidth / clamp(aspect, 2, 5)),
      1,
      MAX_RASTER_HEIGHT,
    );
    return {
      text,
      weight,
      fit,
      tracking,
      aspect,
      rasterWidth,
      rasterHeight,
      pixelRatio,
      fontStatus,
      fontFamily: LIVING_TYPE_FONT_FAMILY,
      fontVersion: LIVING_TYPE_FONT_VERSION,
    };
  }, [box, text, weight, fit, tracking, aspect, fontStatus]);

  const maskKey = request ? maskCacheKey(request) : `pending:${shortHash(`${text}|${weight}|${fit}|${tracking}|${aspect}|${fontStatus}`)}`;

  useEffect(() => {
    if (!request) return;
    const controller = new AbortController();
    let timer = 0;

    timer = window.setTimeout(() => {
      const task = queueRef.current.then(async () => {
        if (controller.signal.aborted) return;
        if (!canvasRef.current) {
          canvasRef.current = document.createElement("canvas");
        }
        const result = await rasterizeLivingTypeMask(request, canvasRef.current, controller.signal);
        if (controller.signal.aborted) return;
        const url = URL.createObjectURL(result.blob);
        if (controller.signal.aborted) {
          URL.revokeObjectURL(url);
          return;
        }
        setEntry({
          key: maskCacheKey(request),
          value: {
            status: "ready",
            key: maskCacheKey(request),
            url,
            width: result.width,
            height: result.height,
            fontStatus: result.fontStatus,
            engine: result.engine,
          },
        });
      });

      // Keep the queue alive after a rejected task.
      queueRef.current = task.catch(() => undefined);

      void task.catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        setEntry({
          key: maskCacheKey(request),
          value: { status: "error", key: maskCacheKey(request), message },
        });
      });
    }, MASK_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [request]);

  // Object URLs are revoked when the mask that owns them is replaced or the
  // component unmounts. The canvas itself is reused for the component's life.
  useEffect(() => {
    if (!entry || entry.value.status !== "ready") return;
    const url = entry.value.url;
    return () => URL.revokeObjectURL(url);
  }, [entry]);

  const derived: LivingTypeMaskState = useMemo(() => {
    if (!request) return { status: "pending" };
    if (entry && entry.key === maskKey) {
      if (entry.value.status === "ready" && entry.value.key === maskKey) return entry.value;
      if (entry.value.status === "error" && entry.value.key === maskKey) return entry.value;
    }
    return { status: "pending" };
  }, [entry, maskKey, request]);

  return { rootRef, box, request, maskKey: shortHash(maskKey), mask: derived };
}

function measureInk(
  context: CanvasRenderingContext2D,
): { left: number; right: number; top: number; bottom: number; width: number; height: number } {
  const metrics = context.measureText(context.canvas.dataset.livingText ?? "");
  const ascent = Number.isFinite(metrics.actualBoundingBoxAscent)
    ? metrics.actualBoundingBoxAscent
    : 0;
  const descent = Number.isFinite(metrics.actualBoundingBoxDescent)
    ? metrics.actualBoundingBoxDescent
    : 0;
  const actualLeft = Number.isFinite(metrics.actualBoundingBoxLeft)
    ? metrics.actualBoundingBoxLeft
    : 0;
  const actualRight = Number.isFinite(metrics.actualBoundingBoxRight)
    ? metrics.actualBoundingBoxRight
    : metrics.width;
  return {
    left: actualLeft,
    right: actualRight,
    top: ascent,
    bottom: descent,
    width: Math.max(actualLeft + actualRight, 1),
    height: Math.max(ascent + descent, 1),
  };
}

function setLetterSpacing(context: CanvasRenderingContext2D, size: number, tracking: number): boolean {
  const target = context as CanvasRenderingContext2D & { letterSpacing?: string };
  if (!("letterSpacing" in target)) return false;
  target.letterSpacing = `${tracking * size}px`;
  return true;
}

function drawWithLetterSpacing(
  context: CanvasRenderingContext2D,
  text: string,
  size: number,
  tracking: number,
  width: number,
  height: number,
): "canvas-letter-spacing" {
  context.font = `${context.canvas.dataset.livingWeight ?? "400"} ${size}px ${context.canvas.dataset.livingFont ?? FALLBACK_STACK}`;
  setLetterSpacing(context, size, tracking);
  const ink = measureInk(context);
  const x = width / 2 - (ink.right - ink.left) / 2;
  const baseline = height / 2 + (ink.top - ink.bottom) / 2;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#fff";
  context.fillText(text, x, baseline);
  return "canvas-letter-spacing";
}

function drawWithManualTracking(
  context: CanvasRenderingContext2D,
  text: string,
  size: number,
  tracking: number,
  width: number,
  height: number,
): "canvas-manual-tracking" {
  context.font = `${context.canvas.dataset.livingWeight ?? "400"} ${size}px ${context.canvas.dataset.livingFont ?? FALLBACK_STACK}`;
  setLetterSpacing(context, 0, 0);
  const spacing = tracking * size;
  let pen = 0;
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  const glyphs: { char: string; pen: number }[] = [];

  for (const char of text) {
    const metrics = context.measureText(char);
    const left = pen - metrics.actualBoundingBoxLeft;
    const right = pen + metrics.actualBoundingBoxRight;
    const top = -metrics.actualBoundingBoxAscent;
    const bottom = metrics.actualBoundingBoxDescent;
    if (char.trim().length > 0) {
      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, bottom);
    }
    glyphs.push({ char, pen });
    pen += metrics.width + spacing;
  }

  if (!Number.isFinite(minX)) {
    minX = 0;
    maxX = 1;
    minY = 0;
    maxY = 1;
  }

  const offsetX = width / 2 - (minX + maxX) / 2;
  const offsetY = height / 2 - (minY + maxY) / 2;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#fff";
  for (const glyph of glyphs) {
    if (glyph.char.trim().length > 0) {
      context.fillText(glyph.char, offsetX + glyph.pen, offsetY);
    }
  }
  return "canvas-manual-tracking";
}

export async function rasterizeLivingTypeMask(
  request: MaskRequest,
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
): Promise<RasterizedMask> {
  if (signal.aborted) throw new Error("Mask rasterisation cancelled.");
  if (typeof document === "undefined") {
    throw new Error("Text mask rasterisation requires a browser document.");
  }

  canvas.width = request.rasterWidth;
  canvas.height = request.rasterHeight;
  const context = canvas.getContext("2d", { alpha: true });
  if (!context) {
    throw new Error("Canvas 2D is unavailable; the wordmark mask cannot be rasterised.");
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.globalCompositeOperation = "source-over";
  context.fillStyle = "#fff";
  context.textAlign = "left";
  context.textBaseline = "alphabetic";

  const stack = fontStack(request.fontStatus);
  const weight = String(request.weight);
  canvas.dataset.livingText = request.text;
  canvas.dataset.livingWeight = weight;
  canvas.dataset.livingFont = stack;

  const targetWidth = request.rasterWidth * request.fit;
  const targetHeight = request.rasterHeight * 0.74;
  const supportsSpacing = "letterSpacing" in context;

  // Measure at a stable probe size, then scale once. The manual path repeats
  // measurement because per-character advances are not kerning-aware.
  context.font = `${weight} 100px ${stack}`;
  if (supportsSpacing) setLetterSpacing(context, 100, request.tracking);
  let probe = measureInk(context);
  let scale = Math.min(targetWidth / probe.width, targetHeight / probe.height);
  if (!Number.isFinite(scale) || scale <= 0) scale = 1;
  let size = 100 * scale;

  if (!supportsSpacing) {
    // Probe the manual layout at 100px to include tracking in the fit.
    const manual = context as CanvasRenderingContext2D;
    const spacing = request.tracking * 100;
    let pen = 0;
    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    for (const char of request.text) {
      const metrics = manual.measureText(char);
      if (char.trim().length > 0) {
        minX = Math.min(minX, pen - metrics.actualBoundingBoxLeft);
        maxX = Math.max(maxX, pen + metrics.actualBoundingBoxRight);
        minY = Math.min(minY, -metrics.actualBoundingBoxAscent);
        maxY = Math.max(maxY, metrics.actualBoundingBoxDescent);
      }
      pen += metrics.width + spacing;
    }
    if (Number.isFinite(minX) && Number.isFinite(maxX)) {
      probe = {
        left: minX,
        right: maxX,
        top: -minY,
        bottom: maxY,
        width: Math.max(maxX - minX, 1),
        height: Math.max(maxY - minY, 1),
      };
      scale = Math.min(targetWidth / probe.width, targetHeight / probe.height);
      if (!Number.isFinite(scale) || scale <= 0) scale = 1;
      size = 100 * scale;
    }
  }

  size = Math.max(1, size);
  context.font = `${weight} ${size}px ${stack}`;
  if (supportsSpacing) {
    setLetterSpacing(context, size, request.tracking);
    probe = measureInk(context);
    // Guard against non-linear metrics at the final size.
    if (probe.width > targetWidth || probe.height > targetHeight) {
      const correction = Math.min(targetWidth / probe.width, targetHeight / probe.height, 1) * 0.995;
      size *= correction;
      context.font = `${weight} ${size}px ${stack}`;
      setLetterSpacing(context, size, request.tracking);
    }
  }

  if (signal.aborted) throw new Error("Mask rasterisation cancelled.");

  const engine = supportsSpacing
    ? drawWithLetterSpacing(context, request.text, size, request.tracking, request.rasterWidth, request.rasterHeight)
    : drawWithManualTracking(context, request.text, size, request.tracking, request.rasterWidth, request.rasterHeight);

  if (signal.aborted) throw new Error("Mask rasterisation cancelled.");

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error("The wordmark mask could not be encoded as a PNG."));
    }, "image/png");
  });

  if (signal.aborted) throw new Error("Mask rasterisation cancelled.");

  return {
    blob,
    width: request.rasterWidth,
    height: request.rasterHeight,
    fontStatus: request.fontStatus,
    engine,
  };
}

