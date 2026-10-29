"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type {
  AsciiWavesHandle,
  AsciiWavesProps,
  AsciiWavesVideoState,
} from "./ascii-waves/ascii-waves";
import styles from "./ascii-waves-canvas.module.css";

const AsciiWavesRuntime = dynamic(
  () => import("./ascii-waves-runtime").then((module) => module.AsciiWavesRuntime),
  { ssr: false, loading: () => null },
);

type RuntimeProps = Pick<
  AsciiWavesProps,
  | "preset"
  | "src"
  | "cellSize"
  | "characters"
  | "color"
  | "invert"
  | "speed"
  | "interactionIntensity"
  | "pointerInteraction"
  | "quality"
  | "playing"
  | "reducedMotion"
  | "ariaLabel"
  | "onError"
>;

/**
 * The site's truthful playback state. `ready` is deliberately not the same as
 * "the video fired canplay": it means the field is either visibly advancing or
 * intentionally frozen by the user's motion preference.
 */
export type FieldPlaybackPhase =
  | "loading"
  | "live"
  | "paused"
  | "reduced"
  | "blocked"
  | "hidden"
  | "offscreen"
  | "error";

export interface FieldPlaybackState {
  phase: FieldPlaybackPhase;
  videoTime: number;
  frameCount: number;
  waveClock: number;
  videoPlaying: boolean;
  pointerStrength: number;
  message: string | null;
}

export interface AsciiWavesCanvasHandle {
  play: () => Promise<void>;
  pause: () => void;
  retry: () => Promise<void>;
}

export interface AsciiWavesCanvasProps extends RuntimeProps {
  poster: { src: string; alt: string };
  className?: string;
  testId?: string;
  priority?: boolean;
  disabled?: boolean;
  /** Fired when the settled phase or measured progress changes materially. */
  onStateChange?: (state: FieldPlaybackState) => void;
  onReady?: () => void;
}

const EMPTY_STATE: FieldPlaybackState = {
  phase: "loading",
  videoTime: 0,
  frameCount: 0,
  waveClock: 0,
  videoPlaying: false,
  pointerStrength: 0,
  message: null,
};

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : "The field could not start.";
}

/**
 * A blocked play() is a recoverable policy state, not a broken renderer. Keep
 * the field mounted and the Start control available instead of falling back.
 */
function isPlaybackBlocked(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "AbortError");
}

export const AsciiWavesCanvas = forwardRef<AsciiWavesCanvasHandle, AsciiWavesCanvasProps>(
  function AsciiWavesCanvas(
    {
      poster,
      className,
      testId,
      priority = false,
      disabled = false,
      playing = true,
      reducedMotion = "system",
      onStateChange,
      onReady,
      onError,
      ...props
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const runtimeRef = useRef<AsciiWavesHandle | null>(null);
    const onStateChangeRef = useRef(onStateChange);
    const onReadyRef = useRef(onReady);
    onStateChangeRef.current = onStateChange;
    onReadyRef.current = onReady;

    const [shouldLoad, setShouldLoad] = useState(false);
    const [selectedSrc, setSelectedSrc] = useState<string | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [runtimeError, setRuntimeError] = useState<string | null>(null);
    const [blockedHold, setBlockedHold] = useState(false);
    const [systemReduced, setSystemReduced] = useState(false);
    const [visible, setVisible] = useState(true);
    const [pageHidden, setPageHidden] = useState(
      () => typeof document !== "undefined" && document.hidden,
    );
    const [state, setState] = useState<FieldPlaybackState>(EMPTY_STATE);

    const lastFrameCount = useRef(0);
    const lastVideoTime = useRef(-1);
    const lastFrameMoveAt = useRef(0);
    const lastVideoMoveAt = useRef(0);
    const observedOnce = useRef(false);
    const loadedAt = useRef(0);
    const lastReportedPhase = useRef<FieldPlaybackPhase>("loading");
    const readyNotified = useRef(false);

    const reduced = reducedMotion === "system" && systemReduced;
    const presetId = props.preset ?? "flower";
    const needsSourceProbe = props.src === undefined && presetId === "flower";
    const effectiveSrc = props.src ?? (needsSourceProbe ? selectedSrc ?? undefined : undefined);
    const sourceSelected = !needsSourceProbe || selectedSrc !== null;

    // The CDN-free site serves H.264 first because it is the reviewed source.
    // WebKit on Linux has no H.264 decoder, so a CC0 VP9 derivative is chosen
    // only when the browser cannot play the reviewed file. This is source
    // selection, not a renderer change.
    useEffect(() => {
      if (props.src !== undefined) {
        setSelectedSrc(props.src);
        return;
      }
      if (presetId !== "flower") {
        setSelectedSrc(null);
        return;
      }
      const probe = document.createElement("video");
      const mp4 = probe.canPlayType('video/mp4; codecs="avc1.42E01E"');
      const webm = probe.canPlayType('video/webm; codecs="vp9"');
      setSelectedSrc(mp4 ? "/media/flower.mp4" : webm ? "/media/flower.webm" : "/media/flower.mp4");
    }, [presetId, props.src]);

    useEffect(() => {
      if (disabled) return undefined;
      const root = rootRef.current;
      if (!root) return undefined;
      if (typeof IntersectionObserver === "undefined") {
        const timer = window.setTimeout(() => setShouldLoad(true), 0);
        return () => window.clearTimeout(timer);
      }

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            // The 360px prefetch margin mounts the effect early; it must not
            // assert that the stage is visible. The second observer owns that.
            setShouldLoad(true);
            observer.disconnect();
          }
        },
        { rootMargin: "360px 0px", threshold: 0.01 },
      );
      observer.observe(root);
      return () => observer.disconnect();
    }, [disabled]);

    useEffect(() => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      const update = () => setSystemReduced(query.matches);
      update();
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }, []);

    useEffect(() => {
      const onVisibility = () => setPageHidden(document.hidden);
      document.addEventListener("visibilitychange", onVisibility);
      return () => document.removeEventListener("visibilitychange", onVisibility);
    }, []);

    useEffect(() => {
      const root = rootRef.current;
      if (!root || typeof IntersectionObserver === "undefined") return undefined;
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) setVisible(entry.isIntersecting);
        },
        { threshold: 0.01 },
      );
      observer.observe(root);
      return () => observer.disconnect();
    }, []);

    const reportError = useCallback((error: unknown) => {
      setRuntimeError(describeError(error));
    }, []);

    // A decode or renderer failure must be visible even if the media never
    // reaches canplay, so this path does not wait for `loaded`.
    useEffect(() => {
      if (!runtimeError) return;
      const next: FieldPlaybackState = { ...EMPTY_STATE, phase: "error", message: runtimeError };
      setState((current) => (current.phase === "error" && current.message === runtimeError ? current : next));
      if (lastReportedPhase.current !== "error") {
        lastReportedPhase.current = "error";
        onStateChangeRef.current?.(next);
      }
    }, [runtimeError]);

    // Observation is read-only. It polls the preserved component's public
    // handle and never rewrites its renderer, video clock or shader.
    useEffect(() => {
      if (!shouldLoad || !loaded || disabled) return undefined;
      if (runtimeError) {
        const next: FieldPlaybackState = { ...EMPTY_STATE, phase: "error", message: runtimeError };
        setState((current) => (current.phase === "error" ? current : next));
        return undefined;
      }

      const sample = () => {
        const runtime = runtimeRef.current;
        if (!runtime) return;
        const video: AsciiWavesVideoState | null = runtime.getVideoState();
        const snapshot = runtime.getSnapshot();
        if (!video || !snapshot) return;

        const now = performance.now();
        if (!observedOnce.current) {
          observedOnce.current = true;
          lastFrameCount.current = snapshot.frameCount;
          lastVideoTime.current = video.currentTime;
        } else {
          if (snapshot.frameCount > lastFrameCount.current) {
            lastFrameCount.current = snapshot.frameCount;
            lastFrameMoveAt.current = now;
          }
          if (Math.abs(video.currentTime - lastVideoTime.current) > 0.004) {
            lastVideoTime.current = video.currentTime;
            lastVideoMoveAt.current = now;
          }
        }

        const frameAdvancing = now - lastFrameMoveAt.current < 650;
        const videoAdvancing = now - lastVideoMoveAt.current < 650;
        const settled = now - loadedAt.current > 1200;

        let phase: FieldPlaybackPhase;
        if (runtimeError) phase = "error";
        else if (pageHidden) phase = "hidden";
        else if (!visible) phase = "offscreen";
        else if (reduced) phase = "reduced";
        else if (!playing) phase = "paused";
        else if (videoAdvancing && frameAdvancing) phase = "live";
        else if (settled) phase = "blocked";
        else phase = "loading";

        if (phase === "blocked") setBlockedHold(true);
        else if (phase === "live" || phase === "paused" || phase === "reduced") setBlockedHold(false);

        const next: FieldPlaybackState = {
          phase,
          videoTime: Number(video.currentTime.toFixed(3)),
          frameCount: snapshot.frameCount,
          waveClock: Number(snapshot.waveClock.toFixed(3)),
          videoPlaying: video.playing,
          pointerStrength: Number(snapshot.pointer.strength.toFixed(3)),
          message:
            phase === "blocked"
              ? "Autoplay did not start. Press Start live field to begin playback."
              : runtimeError,
        };

        setState((current) => {
          if (
            current.phase === next.phase &&
            current.videoTime === next.videoTime &&
            current.frameCount === next.frameCount &&
            current.waveClock === next.waveClock &&
            current.videoPlaying === next.videoPlaying &&
            current.pointerStrength === next.pointerStrength &&
            current.message === next.message
          ) {
            return current;
          }
          return next;
        });

        if (phase !== lastReportedPhase.current) {
          lastReportedPhase.current = phase;
          onStateChangeRef.current?.(next);
          if (
              !readyNotified.current &&
              (phase === "live" || phase === "paused" || phase === "reduced" || phase === "offscreen" || phase === "hidden")
            ) {
            readyNotified.current = true;
            onReadyRef.current?.();
          }
        }
      };

      sample();
      const timer = window.setInterval(sample, 250);
      return () => window.clearInterval(timer);
    }, [disabled, loaded, pageHidden, playing, reduced, runtimeError, shouldLoad, visible]);

    useImperativeHandle(ref, () => ({
      play: async () => {
        setBlockedHold(false);
        try {
          await runtimeRef.current?.play();
        } catch (error) {
          if (!isPlaybackBlocked(error)) reportError(error);
        }
      },
      pause: () => runtimeRef.current?.pause(),
      retry: async () => {
        setRuntimeError(null);
        setBlockedHold(false);
        loadedAt.current = performance.now();
        readyNotified.current = false;
        lastReportedPhase.current = "loading";
        try {
          await runtimeRef.current?.play();
        } catch (error) {
          if (!isPlaybackBlocked(error)) reportError(error);
        }
      },
    }), [reportError]);

    const settled =
      state.phase === "live" ||
      state.phase === "paused" ||
      state.phase === "reduced" ||
      state.phase === "offscreen" ||
      state.phase === "hidden";

    return (
      <div
        ref={rootRef}
        className={`${styles.field} ${className ?? ""}`.trim()}
        data-testid={testId}
        data-ascii-stage
        data-loaded={loaded ? "true" : "false"}
        data-ready={settled ? "true" : "false"}
        data-live={state.phase === "live" ? "true" : "false"}
        data-playback={state.phase}
        data-video-time={state.videoTime}
        data-frame-count={state.frameCount}
        data-wave-clock={state.waveClock}
        data-pointer-strength={state.pointerStrength}
      >
        <Image
          className={styles.poster}
          src={poster.src}
          alt=""
          aria-hidden="true"
          fill
          sizes="(max-width: 760px) 100vw, 50vw"
          priority={priority}
        />
        <span className={styles.vignette} aria-hidden="true" />
        <span className={styles.scan} aria-hidden="true" />
        {shouldLoad && sourceSelected ? (
          <AsciiWavesRuntime
            {...props}
            src={effectiveSrc}
            ref={runtimeRef}
            playing={playing && !blockedHold}
            reducedMotion={reducedMotion}
            className={styles.liveCanvas}
            ariaLabel={props.ariaLabel ?? poster.alt}
            onReady={() => {
              loadedAt.current = performance.now();
              setLoaded(true);
            }}
            onError={(error) => {
              reportError(error);
              onError?.(error);
            }}
          />
        ) : null}
        <span
          className={styles.observation}
          data-field-observation={state.phase}
          aria-live="polite"
        >
          {state.message}
        </span>
      </div>
    );
  },
);

AsciiWavesCanvas.displayName = "AsciiWavesCanvas";
