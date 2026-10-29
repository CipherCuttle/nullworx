import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { TerminalRainEngine, type RainMetrics, type RainSettings } from './rainEngine';
import styles from './TerminalRain.module.css';

export interface TerminalRainProps extends RainSettings {
  playing: boolean;
  seed?: number;
  reducedMotion?: boolean;
  /** Optional luminance source supplied by the stencil compositor. */
  shadeSrc?: string;
  ariaLabel?: string;
  className?: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export interface TerminalRainHandle {
  getMetrics: () => RainMetrics | null;
  getGlyphPalette: () => string[];
}

export const TerminalRain = forwardRef<TerminalRainHandle, TerminalRainProps>(function TerminalRain(
  {
    speed,
    density,
    glow,
    pointerResponse,
    playing,
    seed = 0x51f15e,
    reducedMotion = false,
    shadeSrc,
    ariaLabel = 'Terminal Rain — an animated field of falling monospace glyphs',
    className,
    onReady,
    onError,
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<TerminalRainEngine | null>(null);
  const activeTouch = useRef<number | null>(null);
  const [inView, setInView] = useState(true);
  const [pageHidden, setPageHidden] = useState(
    () => typeof document !== 'undefined' && document.hidden,
  );
  const [failure, setFailure] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getMetrics: () => engineRef.current?.getMetrics() ?? null,
    getGlyphPalette: () => engineRef.current?.getGlyphPalette() ?? [],
  }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let engine: TerminalRainEngine | null = null;
    try {
      engine = new TerminalRainEngine(canvas, {
        seed,
        settings: { speed, density, glow, pointerResponse },
      });
      engineRef.current = engine;
      setFailure(null);
      onReady?.();
    } catch (error) {
      const next = error instanceof Error ? error : new Error('Terminal Rain could not start.');
      setFailure(next.message);
      onError?.(next);
    }
    return () => {
      engine?.dispose();
      if (engineRef.current === engine) engineRef.current = null;
    };
  // The engine is intentionally created once per canvas. Settings flow below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  useEffect(() => {
    engineRef.current?.setSettings({ speed, density, glow, pointerResponse });
  }, [density, glow, pointerResponse, speed]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return undefined;
    if (!shadeSrc) {
      engine.setShade(null);
      return undefined;
    }
    let cancelled = false;
    const image = new Image();
    image.onload = () => { if (!cancelled) engine.setShade(image); };
    image.onerror = () => { if (!cancelled) engine.setShade(null); };
    image.src = shadeSrc;
    return () => { cancelled = true; };
  }, [shadeSrc]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => engineRef.current?.resize());
    const onOrientation = () => engineRef.current?.resize();
    observer.observe(root);
    window.addEventListener('orientationchange', onOrientation, { passive: true });
    window.addEventListener('load', onOrientation, { once: true });
    void document.fonts?.ready.then(onOrientation);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', onOrientation);
      window.removeEventListener('load', onOrientation);
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setInView(entry.isIntersecting);
    }, { threshold: 0.01 });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const shouldRun = playing && !reducedMotion && inView && !pageHidden && !failure;

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (shouldRun) {
      engine.setRunning(true);
    } else {
      engine.setRunning(false);
      engine.drawStaticFrame();
    }
  }, [shouldRun]);

  const updatePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    engineRef.current?.setPointer(
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height,
      true,
    );
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    updatePointer(event);
    if (event.pointerType !== 'mouse') {
      activeTouch.current = event.pointerId;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Capturing is an enhancement; the material still receives moves.
      }
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') {
      updatePointer(event);
      return;
    }
    if (activeTouch.current === event.pointerId) updatePointer(event);
  };

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' && activeTouch.current === event.pointerId) {
      activeTouch.current = null;
      engineRef.current?.setPointerActive(false);
    }
  };

  return (
    <div
      ref={rootRef}
      className={[styles.root, className].filter(Boolean).join(' ')}
      data-material="rain"
      data-ready={failure ? 'false' : 'true'}
      data-failure={failure ?? ''}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') engineRef.current?.setPointerActive(false);
      }}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label={ariaLabel}
        data-rain-canvas=""
      />
      {failure && (
        <div className={styles.fallback} role="status">
          <span>Material unavailable</span>
          <small>{failure}</small>
        </div>
      )}
    </div>
  );
});

TerminalRain.displayName = 'TerminalRain';
