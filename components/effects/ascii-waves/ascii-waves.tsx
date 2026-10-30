"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  AsciiWavesRenderer,
  DEFAULT_SETTINGS,
  type RendererMetrics,
  type RendererSnapshot,
  type WavesSettings,
} from "./renderer";
import {
  ASCII_WAVES_PRESETS,
  DEFAULT_ASCII_WAVES_PRESET,
  resolvePreset,
  type AsciiWavesPresetId,
} from "./presets";
import styles from "./ascii-waves.module.css";

export type AsciiWavesQuality = "high" | "balanced" | "efficient";
export type AsciiWavesReducedMotion = "system" | "play";

export interface AsciiWavesProps {
  /** Named, bundled reel. Flower is the default. */
  preset?: AsciiWavesPresetId;
  /** Optional custom video URL. Overrides the preset's video, but not its poster. */
  src?: string;
  /** Glyph cell pitch in CSS pixels, or a responsive 12/14/16 default. */
  cellSize?: number | "auto";
  /** Ordered characters from darkest to brightest. 48 characters max. */
  characters?: string;
  /** Ink tint as a three- or six-digit hex colour. */
  color?: string;
  /** Flip the luma-to-character mapping. */
  invert?: boolean;
  /** Wave-clock multiplier. 1 is the approved Flower speed. */
  speed?: number;
  /** Pointer eddy strength. 0 disables the response. */
  interactionIntensity?: number;
  /** Set false to remove the pointer listener's effect entirely. */
  pointerInteraction?: boolean;
  /** 2x, 1.5x or 1x render-pixel cap. The browser DPR is always the ceiling. */
  quality?: AsciiWavesQuality;
  /** Playback intent. Pausing also freezes the wave clock. */
  playing?: boolean;
  muted?: boolean;
  loop?: boolean;
  /** Seconds at which a newly loaded source starts. Defaults to the preset offset. */
  startTime?: number;
  /** `system` freezes the field when prefers-reduced-motion is reduce. */
  reducedMotion?: AsciiWavesReducedMotion;
  /** Image shown if WebGL or the video cannot render. Defaults to the preset poster. */
  fallbackImage?: string;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export interface AsciiWavesVideoState {
  ready: boolean;
  playing: boolean;
  currentTime: number;
  duration: number;
  readyState: number;
  src: string;
  muted: boolean;
  loop: boolean;
}

export interface AsciiWavesHandle {
  getMetrics: () => RendererMetrics | null;
  getSnapshot: () => RendererSnapshot | null;
  getVideoState: () => AsciiWavesVideoState | null;
  getWaveClock: () => number;
  play: () => Promise<void>;
  pause: () => void;
  seek: (seconds: number) => Promise<number>;
  setFrozenTime: (seconds: number | null) => void;
  setPointer: (x: number, y: number, active?: boolean) => void;
  setPointerActive: (active: boolean) => void;
  markVideoDirty: () => void;
}

const QUALITY_DPR: Record<AsciiWavesQuality, number> = {
  high: 2,
  balanced: 1.5,
  efficient: 1,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cleanCharacters(value: string | undefined): string {
  const characters = Array.from(value ?? DEFAULT_SETTINGS.characters).slice(0, 48).join("");
  return characters.length > 0 ? characters : DEFAULT_SETTINGS.characters;
}

function responsiveCell(width: number): number {
  if (width <= 520) return 12;
  if (width <= 820) return 14;
  return 16;
}

function isCrossOrigin(src: string): boolean {
  if (src.startsWith("data:") || src.startsWith("blob:")) return false;
  try {
    return new URL(src, window.location.href).origin !== window.location.origin;
  } catch {
    return false;
  }
}

export const AsciiWaves = forwardRef<AsciiWavesHandle, AsciiWavesProps>(function AsciiWaves(
  {
    preset = DEFAULT_ASCII_WAVES_PRESET,
    src,
    cellSize = "auto",
    characters = DEFAULT_SETTINGS.characters,
    color = DEFAULT_SETTINGS.color,
    invert = false,
    speed = DEFAULT_SETTINGS.speed,
    interactionIntensity = DEFAULT_SETTINGS.interactionIntensity,
    pointerInteraction = true,
    quality = "high",
    playing = true,
    muted = true,
    loop = true,
    startTime,
    reducedMotion = "system",
    fallbackImage,
    className,
    style,
    ariaLabel = "ASCII wave field",
    onReady,
    onError,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rendererRef = useRef<AsciiWavesRenderer | null>(null);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const contextEventsSuppressed = useRef(false);
  onReadyRef.current = onReady;
  onErrorRef.current = onError;

  const [rendererEpoch, setRendererEpoch] = useState(0);
  const [canvasVersion, setCanvasVersion] = useState(0);
  const [rendererFailure, setRendererFailure] = useState<string | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [autoCell, setAutoCell] = useState(16);
  const [inView, setInView] = useState(true);
  const [pageHidden, setPageHidden] = useState(() => typeof document !== "undefined" && document.hidden);
  const [systemReduced, setSystemReduced] = useState(false);

  const selectedPreset = resolvePreset(preset);
  const resolvedSrc = src !== undefined ? src : selectedPreset.src;
  const resolvedStartTime = startTime ?? (src !== undefined ? 0 : selectedPreset.startTime);
  const fallbackSrc = fallbackImage !== undefined ? fallbackImage : selectedPreset.poster;
  const reduced = reducedMotion === "system" && systemReduced;
  const effectiveCell = typeof cellSize === "number" && Number.isFinite(cellSize)
    ? clamp(cellSize, 8, 32)
    : autoCell;
  const qualityDpr = QUALITY_DPR[quality] ?? 2;
  const shouldPlay = playing && !reduced && inView && !pageHidden && !rendererFailure && !contextLost && !mediaError;
  const shouldRender = inView
    && !pageHidden
    && !rendererFailure
    && !contextLost
    && !(mediaError && Boolean(fallbackSrc));

  const settings = useMemo<WavesSettings>(() => ({
    ...DEFAULT_SETTINGS,
    characters: cleanCharacters(characters),
    color,
    invert,
    cellSize: effectiveCell,
    speed: Number.isFinite(speed) ? clamp(speed, 0, 4) : DEFAULT_SETTINGS.speed,
    cursorInteraction: pointerInteraction && !reduced && playing,
    interactionIntensity: Number.isFinite(interactionIntensity)
      ? clamp(interactionIntensity, 0, 2)
      : DEFAULT_SETTINGS.interactionIntensity,
  }), [characters, color, effectiveCell, interactionIntensity, invert, playing, pointerInteraction, reduced, speed]);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const shouldPlayRef = useRef(shouldPlay);
  shouldPlayRef.current = shouldPlay;
  const shouldRenderRef = useRef(shouldRender);
  shouldRenderRef.current = shouldRender;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const stateRef = useRef({ mediaReady, rendererFailure, mediaError, reduced });
  stateRef.current = { mediaReady, rendererFailure, mediaError, reduced };

  const reportError = useCallback((error: Error) => {
    onErrorRef.current?.(error);
  }, []);

  // A lost context is a renderer failure even though the constructor succeeded.
  // preventDefault() opts into the browser's restore event. The restored path
  // mounts a fresh canvas so the old context/resources can never be reused.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let unmounting = false;
    const onContextLost = (event: Event) => {
      event.preventDefault();
      if (unmounting || contextEventsSuppressed.current) return;
      rendererRef.current?.setRunning(false);
      videoRef.current?.pause();
      setContextLost(true);
      reportError(new Error("The WebGL context was lost."));
    };
    const onContextRestored = () => {
      if (unmounting || contextEventsSuppressed.current) return;
      setContextLost(false);
      setCanvasVersion((value) => value + 1);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);
    return () => {
      unmounting = true;
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
    };
  }, [canvasVersion, reportError]);

  // One renderer per mounted canvas. A preset or prop change never rebuilds the
  // program. canvasVersion only changes after a real context-loss restore.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let renderer: AsciiWavesRenderer | null = null;
    try {
      renderer = new AsciiWavesRenderer(canvas, { maxDpr: QUALITY_DPR[quality] ?? 2 });
      renderer.setSettings(settingsRef.current);
      renderer.setRunning(shouldRenderRef.current);
      rendererRef.current = renderer;
      contextEventsSuppressed.current = false;
      setRendererFailure(null);
      setRendererEpoch((value) => value + 1);
    } catch (error) {
      const failure = error instanceof Error ? error : new Error("The WebGL renderer could not start.");
      setRendererFailure(failure.message);
      reportError(failure);
    }
    return () => {
      contextEventsSuppressed.current = true;
      renderer?.dispose();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  // A renderer is intentionally created once per canvas/mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasVersion]);

  useEffect(() => {
    rendererRef.current?.setSettings(settings);
  }, [settings]);

  useEffect(() => {
    rendererRef.current?.setMaxDpr(qualityDpr);
  }, [qualityDpr]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const measure = () => {
      if (typeof cellSize !== "number") {
        const next = responsiveCell(root.clientWidth || window.innerWidth);
        setAutoCell((value) => (value === next ? value : next));
      }
      rendererRef.current?.resize();
    };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(root);
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("orientationchange", measure, { passive: true });
    measure();
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [cellSize, rendererEpoch]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    if (typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry) setInView(entry.isIntersecting);
    }, { threshold: 0.01 });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSystemReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Source loading is independent from renderer construction. The same video
  // element and texture are reused when a preset changes.
  useEffect(() => {
    const video = videoRef.current;
    const renderer = rendererRef.current;
    if (!video || !renderer) return undefined;

    let disposed = false;
    let notified = false;
    setMediaReady(false);
    setMediaError(null);

    if (!resolvedSrc) {
      renderer.setVideo(null, false);
      video.pause();
      setMediaReady(true);
      onReadyRef.current?.();
      return undefined;
    }

    video.pause();
    video.crossOrigin = isCrossOrigin(resolvedSrc) ? "anonymous" : null;
    video.src = resolvedSrc;
    renderer.setVideo(video, true);
    renderer.markVideoDirty();

    const markReady = () => {
      if (disposed || notified) return;
      notified = true;
      setMediaReady(true);
      renderer.markVideoDirty();
      onReadyRef.current?.();
    };

    const onLoadedMetadata = () => {
      if (disposed) return;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const target = clamp(resolvedStartTime, 0, Math.max(0, duration - 0.04));
      if (target > 0 && Math.abs(video.currentTime - target) > 0.01) {
        video.currentTime = target;
      }
      renderer.markVideoDirty();
    };

    const onCanPlay = () => {
      if (disposed) return;
      markReady();
      if (shouldPlayRef.current) {
        void video.play().catch(() => {
          // Autoplay can be blocked. The explicit play controls remain usable.
        });
      }
    };

    const onError = () => {
      if (disposed) return;
      const message = "This video could not be decoded.";
      setMediaReady(false);
      setMediaError(message);
      reportError(new Error(message));
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);
    if (video.readyState >= 1) onLoadedMetadata();
    if (video.readyState >= 3) onCanPlay();

    return () => {
      disposed = true;
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
      video.pause();
      video.removeAttribute("src");
      video.load();
      renderer.setVideo(null, false);
    };
  }, [resolvedSrc, resolvedStartTime, canvasVersion, reportError]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
    video.loop = loop;
  }, [muted, loop, resolvedSrc]);

  useEffect(() => {
    rendererRef.current?.setRunning(shouldRender);
  }, [shouldRender, rendererEpoch]);

  // Playback intent, reduced motion and visibility all settle here. A paused
  // component freezes the wave clock instead of only pausing the decoder.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    renderer.setFrozenTime(shouldPlay ? null : renderer.getWaveClock());
  }, [shouldPlay, rendererEpoch]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !mediaReady) return;
    if (shouldPlay) {
      void video.play().catch(() => {
        // Keep the decoded frame and the last wave clock if the browser blocks play.
      });
    } else {
      video.pause();
    }
  }, [shouldPlay, mediaReady, rendererEpoch]);

  useEffect(() => {
    const renderer = rendererRef.current;
    const video = videoRef.current;
    if (!renderer || !video) return undefined;
    if (!shouldRender) {
      video.pause();
      return undefined;
    }
    if (shouldPlayRef.current) {
      void video.play().catch(() => {});
    }
    return undefined;
  }, [shouldRender, rendererEpoch]);

  // Pointer input is bound to the component's own box, not the window, so two
  // placements cannot fight over one global pointer.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let activePointer: number | null = null;

    const update = (event: PointerEvent) => {
      const renderer = rendererRef.current;
      if (!renderer) return;
      const rect = root.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      renderer.setPointer(
        (event.clientX - rect.left) / rect.width,
        (event.clientY - rect.top) / rect.height,
        true,
      );
    };
    const onDown = (event: PointerEvent) => {
      update(event);
      if (event.pointerType !== "mouse") {
        activePointer = event.pointerId;
        if (root.setPointerCapture) {
          try {
            root.setPointerCapture(event.pointerId);
          } catch {
            // Pointer capture is an optimisation; the field still receives moves.
          }
        }
      }
    };
    const onEnd = (event: PointerEvent) => {
      if (event.pointerId === activePointer) activePointer = null;
      if (event.pointerType !== "mouse") {
        rendererRef.current?.setPointerActive(false);
      }
    };
    const onLeave = (event: PointerEvent) => {
      // Touch pointers receive a leave when capture retargets the stream to
      // this element. Only a mouse leaving the box should settle the eddy.
      if (event.pointerType !== "mouse" || activePointer !== null) return;
      rendererRef.current?.setPointerActive(false);
    };
    const onBlur = () => {
      activePointer = null;
      rendererRef.current?.setPointerActive(false);
    };
    const onMove = (event: PointerEvent) => update(event);

    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerdown", onDown, { passive: true });
    root.addEventListener("pointerup", onEnd, { passive: true });
    root.addEventListener("pointercancel", onEnd, { passive: true });
    root.addEventListener("pointerleave", onLeave, { passive: true });
    window.addEventListener("blur", onBlur);
    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointerup", onEnd);
      root.removeEventListener("pointercancel", onEnd);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onBlur);
      if (activePointer !== null) rendererRef.current?.setPointerActive(false);
    };
  }, [rendererEpoch]);

  useImperativeHandle(ref, () => ({
    getMetrics: () => rendererRef.current?.getMetrics() ?? null,
    getSnapshot: () => rendererRef.current?.snapshot() ?? null,
    getVideoState: () => {
      const video = videoRef.current;
      if (!video) return null;
      return {
        ready: stateRef.current.mediaReady,
        playing: Boolean(video.currentSrc) && !video.paused,
        currentTime: Number.isFinite(video.currentTime) ? video.currentTime : 0,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        readyState: video.readyState,
        src: video.currentSrc,
        muted: video.muted,
        loop: video.loop,
      };
    },
    getWaveClock: () => rendererRef.current?.getWaveClock() ?? 0,
    play: () => videoRef.current?.play() ?? Promise.resolve(),
    pause: () => videoRef.current?.pause(),
    seek: (seconds: number) => new Promise<number>((resolve) => {
      const video = videoRef.current;
      if (!video) {
        resolve(0);
        return;
      }
      const target = clamp(seconds, 0, Math.max(0, video.duration - 0.04));
      const complete = () => {
        video.removeEventListener("seeked", complete);
        rendererRef.current?.markVideoDirty();
        resolve(video.currentTime);
      };
      video.addEventListener("seeked", complete);
      video.currentTime = target;
    }),
    setFrozenTime: (seconds: number | null) => rendererRef.current?.setFrozenTime(seconds),
    setPointer: (x: number, y: number, active = true) => rendererRef.current?.setPointer(x, y, active),
    setPointerActive: (active: boolean) => rendererRef.current?.setPointerActive(active),
    markVideoDirty: () => rendererRef.current?.markVideoDirty(),
  }), []);

  const fallback = Boolean(rendererFailure || contextLost || mediaError);
  const showFallbackImage = fallback && Boolean(fallbackSrc);
  const fallbackLabel = rendererFailure
    ? "ASCII Waves could not start WebGL 2."
    : contextLost
      ? "The WebGL context was lost."
      : mediaError ?? "The source video could not be decoded.";

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${className ?? ""}`.trim()}
      style={style}
      data-ascii-waves=""
      data-preset={selectedPreset.id}
      data-ready={mediaReady ? "true" : "false"}
      data-fallback={fallback ? "true" : "false"}
      data-reduced-motion={reduced ? "true" : "false"}
      data-renderer={rendererFailure || contextLost ? "unavailable" : "webgl2"}
      aria-busy={!mediaReady && !fallback}
    >
      <canvas
        key={canvasVersion}
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label={ariaLabel}
        hidden={showFallbackImage}
      />
      <video
        ref={videoRef}
        className={styles.video}
        muted={muted}
        loop={loop}
        playsInline
        preload="auto"
        aria-hidden="true"
        tabIndex={-1}
      />
      {showFallbackImage && (
        // eslint-disable-next-line @next/next/no-img-element -- fallback URL is consumer-supplied
        <img
          className={styles.fallbackImage}
          src={fallbackSrc}
          alt={`Fallback still for ${selectedPreset.title}`}
          draggable={false}
        />
      )}
      {fallback && (
        <div className={styles.fallbackNote} role="status">
          <span>{fallbackLabel}</span>
          {!showFallbackImage && <small>WebGL 2 and a decodable source are required.</small>}
        </div>
      )}
    </div>
  );
});

AsciiWaves.displayName = "AsciiWaves";

export { ASCII_WAVES_PRESETS, DEFAULT_ASCII_WAVES_PRESET };
export type { AsciiWavesPreset, AsciiWavesPresetId } from "./presets";
