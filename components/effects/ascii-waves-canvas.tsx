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
import { FLOWER_MEDIA, type FieldMedia } from "./field-media";
import { createCyclicMediaSource } from "./cyclic-media-source";
import styles from "./ascii-waves-canvas.module.css";

const AsciiWavesRuntime = dynamic(
  () => import("./ascii-waves-runtime").then((module) => module.AsciiWavesRuntime),
  { ssr: false, loading: () => null },
);

type RuntimeProps = Pick<
  AsciiWavesProps,
  | "preset"
  | "src"
  | "startTime"
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
  | "stalled"
  | "hidden"
  | "offscreen"
  | "error";

export interface FieldPlaybackState {
  phase: FieldPlaybackPhase;
  videoTime: number;
  nativeVideoTime: number;
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
  media?: FieldMedia;
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
  nativeVideoTime: 0,
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
  return error instanceof DOMException && error.name === "NotAllowedError";
}

export const AsciiWavesCanvas = forwardRef<AsciiWavesCanvasHandle, AsciiWavesCanvasProps>(
  function AsciiWavesCanvas(
    {
      poster,
      media = FLOWER_MEDIA,
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
    const [mayInitializeMedia, setMayInitializeMedia] = useState(false);
    const [selectedSrc, setSelectedSrc] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [streaming, setStreaming] = useState(false);
    const loopSourceRef = useRef<ReturnType<typeof createCyclicMediaSource> | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [runtimeError, setRuntimeError] = useState<string | null>(null);
    const [blockedHold, setBlockedHold] = useState(false);
    const [systemReduced, setSystemReduced] = useState(false);
    const [visible, setVisible] = useState(false);
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
    const autoplayDenied = useRef(false);
    const hasPlayed = useRef(false);
    const presented = useRef({ at: 0, time: 0, count: 0 });
    const frameObserverActive = useRef(false);

    const reduced = reducedMotion === "system" && systemReduced;
    const presetId = props.preset ?? "flower";
    const needsSourceProbe = props.src === undefined && presetId === "flower";
    const effectiveSrc = props.src ?? (needsSourceProbe ? selectedSrc ?? undefined : undefined);
    // Probing chooses a codec for the bundled preset. Passing that URL as src
    // otherwise makes the preserved component treat it as a custom clip and
    // start at zero, losing Flower's reviewed opening frame.
    const effectiveStartTime = props.startTime ?? (needsSourceProbe ? media.startTime : undefined);
    const sourceSelected = !needsSourceProbe || selectedSrc !== null;
    const playbackAllowed = playing && !blockedHold && !reduced && visible && !pageHidden && !runtimeError;
    const playbackAllowedRef = useRef(playbackAllowed);
    playbackAllowedRef.current = playbackAllowed;

    // Serve the appropriate local cyclic derivative. Probe its actual H.264
    // profile; the VP9 branch also covers this Linux WebKit installation.
    useEffect(() => {
      if (props.src !== undefined) {
        setSelectedSrc(props.src);
        setSelectedFile(props.src);
        setStreaming(false);
        return;
      }
      if (presetId !== "flower") {
        setSelectedSrc(null);
        setSelectedFile(null);
        setStreaming(false);
        return;
      }
      if (!shouldLoad || !mayInitializeMedia) return undefined;
      const probe = document.createElement("video");
      const mp4 = probe.canPlayType(`video/mp4; codecs="${media.mp4Codec ?? "avc1.64001F"}"`);
      const webm = probe.canPlayType('video/webm; codecs="vp9"');
      const useMp4 = Boolean(mp4) && !(media.preferWebm && webm);
      const file = useMp4 ? media.mp4 : webm ? media.webm : media.mp4;
      const mime = useMp4 ? `video/mp4; codecs="${media.mp4Codec ?? "avc1.64001F"}"` : 'video/webm; codecs="vp9"';
      setSelectedFile(file);
      if (typeof MediaSource !== "undefined" && MediaSource.isTypeSupported(mime)) {
        const loop = createCyclicMediaSource({
          file, mime, duration: media.duration,
          getVideo: () => rootRef.current?.querySelector("video") ?? null,
          onError: error => setRuntimeError(describeError(error)),
        });
        loopSourceRef.current = loop;
        setStreaming(true);
        setSelectedSrc(loop.url);
        return () => { loop.dispose(); if (loopSourceRef.current === loop) loopSourceRef.current = null; };
      }
      setStreaming(false);
      setSelectedSrc(file);
      return undefined;
    }, [mayInitializeMedia, media.duration, media.mp4, media.mp4Codec, media.preferWebm, media.webm, presetId, props.src, shouldLoad]);

    // WPE can reject a paused MSE seek when its video is initially offscreen.
    // Prime the decoder only after the field first enters the foreground
    // viewport. This is sticky: later visibility changes pause the existing
    // media and renderer without recreating either one.
    useEffect(() => {
      if (visible && !pageHidden) setMayInitializeMedia(true);
    }, [pageHidden, visible]);

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
            // Near-viewport readiness is separate from actual visibility.
            // The second observer owns initial decoder activation.
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
      if (!root) return undefined;
      if (typeof IntersectionObserver === "undefined") {
        setVisible(true);
        return undefined;
      }
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

    const playRuntime = useCallback(async () => {
      try {
        await runtimeRef.current?.play();
        autoplayDenied.current = false;
      } catch (error) {
        if (isPlaybackBlocked(error)) autoplayDenied.current = true;
        // pause(), seeking and visibility changes can interrupt pending play().
        else if (!(error instanceof DOMException && error.name === "AbortError")) reportError(error);
      }
    }, [reportError]);

    useEffect(() => {
      const video = rootRef.current?.querySelector("video");
      if (!loaded || !video || typeof video.requestVideoFrameCallback !== "function") return undefined;
      presented.current = { at: 0, time: 0, count: 0 };
      frameObserverActive.current = true;
      let callback: number;
      const onFrame: VideoFrameRequestCallback = (now, metadata) => {
        // Native GStreamer loops can present frames with their HTML clock
        // stuck at EOF. Observe actual frames without flushing seeks,
        // restarting playback, or changing the preserved renderer's clock.
        const previous = presented.current;
        const moved = previous.count > 0 && Math.abs(metadata.mediaTime - previous.time) > 0.004;
        presented.current = {
          at: moved && !video.paused ? now : previous.at,
          time: metadata.mediaTime,
          count: previous.count + 1,
        };
        callback = video.requestVideoFrameCallback(onFrame);
      };
      callback = video.requestVideoFrameCallback(onFrame);
      return () => {
        frameObserverActive.current = false;
        video.cancelVideoFrameCallback(callback);
      };
    }, [effectiveSrc, loaded]);

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

      // A deliberate pause can outlast the progress window. Give resumed
      // playback the same existing startup grace before diagnosing a stall.
      // This never calls play() or retries media while intent is held.
      loadedAt.current = performance.now();

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

        const frameAdvancing = lastFrameMoveAt.current > 0 && now - lastFrameMoveAt.current < 650;
        const presentedAdvancing = presented.current.at > 0 && now - presented.current.at < 650;
        const videoAdvancing = frameObserverActive.current
          ? presentedAdvancing
          : lastVideoMoveAt.current > 0 && now - lastVideoMoveAt.current < 650;
        // Firefox can report cumulative rVFC mediaTime after native loops. Use
        // frame time only while it is within the source's own duration.
        const frameTime = frameObserverActive.current && presented.current.count > 0 ? presented.current.time : video.currentTime;
        // The continuous timeline has a reliable native clock. A paused frame
        // callback can preroll the next picture, so it must not move the held
        // source position reported to controls and reduced-motion consumers.
        const sourceTime = streaming ? video.currentTime % media.duration
          : frameTime <= video.duration ? frameTime : video.currentTime;
        const settled = now - loadedAt.current > 1200;
        if (videoAdvancing && frameAdvancing) {
          hasPlayed.current = true;
          autoplayDenied.current = false;
        }

        let phase: FieldPlaybackPhase;
        if (runtimeError) phase = "error";
        else if (pageHidden) phase = "hidden";
        else if (!visible) phase = "offscreen";
        else if (reduced) phase = "reduced";
        else if (!playing) phase = "paused";
        else if (videoAdvancing && frameAdvancing) phase = "live";
        else if (settled) phase = autoplayDenied.current && !hasPlayed.current ? "blocked" : "stalled";
        else phase = "loading";

        if (phase === "blocked" || phase === "stalled") setBlockedHold(true);
        else if (phase === "live" || phase === "paused" || phase === "reduced") setBlockedHold(false);

        const next: FieldPlaybackState = {
          phase,
          videoTime: Number(sourceTime.toFixed(3)),
          nativeVideoTime: Number(video.currentTime.toFixed(3)),
          frameCount: snapshot.frameCount,
          waveClock: Number(snapshot.waveClock.toFixed(3)),
          videoPlaying: video.playing,
          pointerStrength: Number(snapshot.pointer.strength.toFixed(3)),
          message:
            phase === "blocked"
              ? "Autoplay did not start. Press Start live field to begin playback."
              : phase === "stalled"
                ? "Playback stopped advancing. Use the playback control to restart the field."
              : runtimeError,
        };

        setState((current) => {
          if (
            current.phase === next.phase &&
            current.videoTime === next.videoTime &&
            current.nativeVideoTime === next.nativeVideoTime &&
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
    }, [disabled, loaded, media.duration, pageHidden, playing, reduced, runtimeError, shouldLoad, streaming, visible]);

    useImperativeHandle(ref, () => ({
      play: async () => {
        setBlockedHold(false);
        loadedAt.current = performance.now();
        await playRuntime();
      },
      pause: () => runtimeRef.current?.pause(),
      retry: async () => {
        setRuntimeError(null);
        setBlockedHold(false);
        loadedAt.current = performance.now();
        readyNotified.current = false;
        lastReportedPhase.current = "loading";
        await playRuntime();
      },
    }), [playRuntime]);

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
        data-playback-reason={state.phase === "blocked" ? "autoplay-blocked" : state.phase === "stalled" ? "playback-stalled" : undefined}
        data-video-time={state.videoTime}
        data-native-video-time={state.nativeVideoTime}
        data-source-url={selectedFile ?? props.src}
        data-loop-mode={streaming ? "buffered" : "native"}
        data-cycle-duration={media.duration}
        data-loop-appends={loopSourceRef.current?.stats.appends ?? 0}
        data-loop-cycles={loopSourceRef.current?.stats.cycles ?? 0}
        data-loop-fetches={loopSourceRef.current?.stats.fetches ?? 0}
        data-loop-removals={loopSourceRef.current?.stats.removals ?? 0}
        data-loop-buffer-seconds={loopSourceRef.current?.stats.bufferedSeconds ?? 0}
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
        {shouldLoad && mayInitializeMedia && sourceSelected ? (
          <AsciiWavesRuntime
            {...props}
            src={effectiveSrc}
            startTime={effectiveStartTime}
            loop={!streaming}
            fallbackImage={poster.src}
            ref={runtimeRef}
            playing={playing && !blockedHold}
            reducedMotion={reducedMotion}
            className={styles.liveCanvas}
            ariaLabel={props.ariaLabel ?? poster.alt}
            onReady={() => {
              loadedAt.current = performance.now();
              setLoaded(true);
              // Observe the actual policy rejection; a silent clock stall is
              // never enough evidence to label autoplay as blocked.
              if (playbackAllowedRef.current) void playRuntime();
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
