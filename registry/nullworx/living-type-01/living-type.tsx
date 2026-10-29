"use client";

import "./living-type-font.css";

import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { MeshGradientProps } from "@paper-design/shaders-react";
import styles from "./living-type.module.css";
import {
  DEFAULT_LIVING_TYPE_RECIPE,
  DEFAULT_PRESET_ID,
  LIVING_TYPE_TEXT_PATTERN,
  createLivingTypeRecipe,
  hexToRgbTriplet,
  parseLivingTypeRecipe,
  type LivingTypeColors,
  type LivingTypeMaterial,
  type LivingTypePresetId,
  type LivingTypeRecipe,
  type LivingTypeRecipeOptions,
  type ReducedMotionPreference,
} from "./living-type-recipe";
import { useLivingTypeFont, useLivingTypeMask } from "./living-type-mask";

/**
 * The Paper Shaders package is lazy-loaded so the consumer's initial route does
 * not pay for the renderer before the wordmark is on screen. This is a plain
 * dynamic import: it is not a Next-specific API and works in Vite.
 */
const LazyMeshGradient = lazy(() =>
  import("@paper-design/shaders-react").then((module) => ({ default: module.MeshGradient })),
);

export interface LivingTypeProps {
  /** A complete recipe. When supplied, it takes precedence over convenience props. */
  recipe?: LivingTypeRecipe;
  text?: string;
  preset?: LivingTypePresetId;
  paused?: boolean;
  reducedMotion?: ReducedMotionPreference;
  weight?: number;
  fit?: number;
  tracking?: number;
  aspect?: number;
  colors?: LivingTypeColors;
  material?: Partial<LivingTypeMaterial>;
  className?: string;
  style?: CSSProperties;
  /** Optional observation hook for a demo or analytics wrapper. */
  onRendererStateChange?: (state: LivingTypeRendererState) => void;
}

export type LivingTypeRendererState =
  | "loading"
  | "shader"
  | "static-fallback"
  | "context-lost"
  | "mask-error"
  | "mask-unsupported"
  | "shader-error";
type RendererState = LivingTypeRendererState;


function combineClassNames(...values: (string | undefined)[]): string {
  return values.filter(Boolean).join(" ");
}

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefers(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return prefers;
}

function recipeFromProps(props: LivingTypeProps): LivingTypeRecipe {
  const options: LivingTypeRecipeOptions = {
    text: props.text,
    preset: props.preset,
    paused: props.paused,
    reducedMotion: props.reducedMotion,
    weight: props.weight,
    fit: props.fit,
    tracking: props.tracking,
    aspect: props.aspect,
    colors: props.colors,
    material: props.material,
  };
  const clean = Object.fromEntries(
    Object.entries(options).filter(([, value]) => value !== undefined),
  ) as LivingTypeRecipeOptions;
  return createLivingTypeRecipe(clean);
}

function RecipeError({ issues }: { issues: { path: string; message: string }[] }) {
  const visible = issues.slice(0, 6);
  return (
    <div className={styles.recipeError} role="alert" data-living-type-error="true">
      <p className={styles.recipeErrorTitle}>Living Type 01 rejected this recipe.</p>
      <ul className={styles.recipeErrorList}>
        {visible.map((issue) => (
          <li key={`${issue.path}:${issue.message}`}>
            <code>{issue.path}</code> {issue.message}
          </li>
        ))}
      </ul>
      {issues.length > visible.length ? (
        <p className={styles.recipeErrorMore}>and {issues.length - visible.length} more issue(s).</p>
      ) : null}
    </div>
  );
}

class ShaderErrorBoundary extends Component<
  { onFailure: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function rendererFor(
  webgl: string,
  maskStatus: string,
  maskSupport: "checking" | "supported" | "unsupported",
): RendererState {
  if (maskSupport === "unsupported") return "mask-unsupported";
  if (maskStatus === "error") return "mask-error";
  if (webgl === "unsupported") return "static-fallback";
  if (webgl === "lost") return "context-lost";
  if (webgl === "failed") return "shader-error";
  if (webgl === "ready" && maskStatus === "ready") return "shader";
  return "loading";
}

function fallbackMessage(renderer: RendererState, maskError: string | null): string {
  if (renderer === "context-lost") return "WebGL context lost · static fallback";
  if (renderer === "shader-error") return "Renderer failed · static fallback";
  if (renderer === "mask-error") return maskError ?? "Typesetting failed · static fallback";
  if (renderer === "mask-unsupported") return "CSS mask unavailable · static fallback";
  return "WebGL2 unavailable · static fallback";
}

function LivingTypeRenderer({
  recipe,
  paused,
  reducedMotion,
  className,
  style,
  onRendererStateChange,
}: {
  recipe: LivingTypeRecipe;
  paused?: boolean;
  reducedMotion?: ReducedMotionPreference;
  className?: string;
  style?: CSSProperties;
  onRendererStateChange?: (state: LivingTypeRendererState) => void;
}) {
  const config = recipe.config;
  const [webgl, setWebgl] = useState<"checking" | "ready" | "unsupported" | "lost" | "failed">(
    "checking",
  );
  const [retryNonce, setRetryNonce] = useState(0);
  const [maskSupport, setMaskSupport] = useState<"checking" | "supported" | "unsupported">("checking");
  const prefersReduced = usePrefersReducedMotion();
  const font = useLivingTypeFont(config.font.weight);
  const { rootRef, box, mask, maskKey } = useLivingTypeMask({
    text: config.text,
    weight: config.font.weight,
    fit: config.font.fit,
    tracking: config.font.tracking,
    aspect: config.layout.aspect,
    fontStatus: font.status,
  });

  const effectivePaused = paused ?? config.playback.paused;
  const reduced =
    (reducedMotion ?? config.playback.reducedMotion) === "force" ||
    ((reducedMotion ?? config.playback.reducedMotion) === "auto" && prefersReduced);
  const motionPaused = effectivePaused || reduced;
  const renderer = rendererFor(webgl, mask.status, maskSupport);

  useEffect(() => {
    if (typeof CSS === "undefined" || typeof CSS.supports !== "function") {
      setMaskSupport("unsupported");
      return;
    }
    const supported =
      CSS.supports("mask-image", "linear-gradient(#000, #000)") ||
      CSS.supports("-webkit-mask-image", "linear-gradient(#000, #000)");
    setMaskSupport(supported ? "supported" : "unsupported");
  }, []);

  useEffect(() => {
    onRendererStateChange?.(renderer);
  }, [onRendererStateChange, renderer]);

  useEffect(() => {
    setWebgl("checking");
    let disposed = false;
    try {
      const probe = document.createElement("canvas");
      const context = probe.getContext("webgl2", {
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      });
      if (!context) {
        setWebgl("unsupported");
        return;
      }
      context.getExtension("WEBGL_lose_context")?.loseContext();
      if (!disposed) setWebgl("ready");
      return () => {
        disposed = true;
      };
    } catch {
      setWebgl("unsupported");
    }
    return () => {
      disposed = true;
    };
  }, [retryNonce]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onLost = (event: Event) => {
      // Keep the event cancelable so the browser may restore the context while
      // we deliberately unmount the broken mount and show a static fallback.
      event.preventDefault();
      setWebgl("lost");
    };
    root.addEventListener("webglcontextlost", onLost, true);
    return () => root.removeEventListener("webglcontextlost", onLost, true);
  }, [rootRef]);

  const shaderProps = useMemo<MeshGradientProps>(
    () => ({
      colors: config.colors,
      speed: motionPaused ? 0 : config.material.speed,
      frame: 0,
      distortion: config.material.distortion,
      swirl: config.material.swirl,
      grainMixer: config.material.grainMixer,
      grainOverlay: config.material.grainOverlay,
      fit: "cover",
      scale: config.material.scale,
      rotation: config.material.rotation,
      minPixelRatio: 1,
      maxPixelCount: 1_500_000,
      style: { width: "100%", height: "100%" },
    }),
    [config.colors, config.material, motionPaused],
  );

  const fallbackFontSize =
    box.width > 0
      ? Math.max(
          10,
          Math.min(
            (box.width * 0.86) /
              Math.max(
                1,
                config.text.length * 0.82 +
                  Math.max(0, config.font.tracking) * Math.max(0, config.text.length - 1),
              ),
            box.height * 0.56,
          ),
        )
      : undefined;

  const stylesheet = {
    ...style,
    aspectRatio: String(config.layout.aspect),
    "--lt-glow-rgb": hexToRgbTriplet(config.colors[1]),
    "--lt-glow-alt-rgb": hexToRgbTriplet(config.colors[3]),
    "--lt-weight": String(config.font.weight),
    "--lt-tracking": `${config.font.tracking}em`,
    "--lt-fallback-size": fallbackFontSize ? `${fallbackFontSize}px` : undefined,
  } as CSSProperties;

  const showFallback =
    renderer === "static-fallback" ||
    renderer === "context-lost" ||
    renderer === "shader-error" ||
    renderer === "mask-error" ||
    renderer === "mask-unsupported";
  const canRetry = renderer === "context-lost" || renderer === "shader-error";
  const maskReady = mask.status === "ready";
  const maskError = mask.status === "error" ? mask.message : null;
  const maskStyle: CSSProperties | undefined = maskReady
    ? {
        maskImage: `url("${mask.url}")`,
        WebkitMaskImage: `url("${mask.url}")`,
      }
    : undefined;

  return (
    <div
      ref={rootRef}
      className={combineClassNames(styles.root, className)}
      style={stylesheet}
      data-living-type="living-type-01"
      data-preset={config.preset}
      data-renderer={renderer}
      data-webgl={webgl}
      data-mask-state={mask.status}
      data-mask-support={maskSupport}
      data-mask-key={maskKey}
      data-mask-engine={maskReady ? mask.engine : undefined}
      data-mask-width={maskReady ? mask.width : undefined}
      data-mask-height={maskReady ? mask.height : undefined}
      data-font-state={font.status}
      data-paused={motionPaused ? "true" : "false"}
      data-reduced={reduced ? "true" : "false"}
      data-text={config.text}
      aria-busy={mask.status === "pending" ? "true" : "false"}
    >
      <span className={styles.srOnly}>{config.text}</span>

      <div className={styles.visual} aria-hidden="true">
        <div className={styles.halo} />
        <div
          className={styles.maskLayer}
          data-ready={maskReady ? "true" : "false"}
          style={maskStyle}
        >
          {webgl === "ready" && maskSupport === "supported" && mask.status !== "error" ? (
            <ShaderErrorBoundary onFailure={() => setWebgl("failed")}>
              <Suspense fallback={null}>
                <LazyMeshGradient {...shaderProps} />
              </Suspense>
            </ShaderErrorBoundary>
          ) : null}
        </div>

        {showFallback ? (
          <div className={styles.fallback} data-testid="living-type-fallback">
            <span className={styles.fallbackText}>{config.text}</span>
            <span className={styles.fallbackNote}>{fallbackMessage(renderer, maskError)}</span>
          </div>
        ) : null}
      </div>

      {canRetry ? (
        <button
          type="button"
          className={styles.retry}
          onClick={() => {
            setWebgl("checking");
            setRetryNonce((value) => value + 1);
          }}
        >
          Retry renderer
        </button>
      ) : null}

      <span className={styles.srOnly} role="status">
        {mask.status === "pending"
          ? "Setting the wordmark."
          : renderer === "shader"
            ? "Wordmark ready."
            : showFallback
              ? fallbackMessage(renderer, maskError)
              : ""}
      </span>
    </div>
  );
}

/**
 * NULLWORX / LIVING TYPE 01.
 *
 * The accessible wordmark is real DOM text. All canvas and shader output is
 * decorative and hidden from assistive technology, so the word is announced
 * once, not once per visual layer.
 */
export function LivingType({
  recipe,
  text,
  preset,
  paused,
  reducedMotion,
  weight,
  fit,
  tracking,
  aspect,
  colors,
  material,
  className,
  style,
  onRendererStateChange,
}: LivingTypeProps) {
  const parsed = useMemo(() => {
    if (recipe) return parseLivingTypeRecipe(recipe);
    try {
      return parseLivingTypeRecipe(
        recipeFromProps({
          text,
          preset,
          paused,
          reducedMotion,
          weight,
          fit,
          tracking,
          aspect,
          colors,
          material,
        }),
      );
    } catch (error) {
      return {
        ok: false as const,
        issues: [{ path: "(props)", message: error instanceof Error ? error.message : String(error) }],
      };
    }
  }, [recipe, text, preset, paused, reducedMotion, weight, fit, tracking, aspect, colors, material]);

  if (!parsed.ok) return <RecipeError issues={parsed.issues} />;

  return (
    <LivingTypeRenderer
      recipe={parsed.recipe}
      paused={paused}
      reducedMotion={reducedMotion}
      className={className}
      style={style}
      onRendererStateChange={onRendererStateChange}
    />
  );
}

export { DEFAULT_LIVING_TYPE_RECIPE, DEFAULT_PRESET_ID, LIVING_TYPE_TEXT_PATTERN };
export {
  LIVING_TYPE_PRESETS,
  PRESET_IDS,
  createLivingTypeRecipe,
  getPreset,
  parseLivingTypeRecipe,
  stringifyLivingTypeRecipe,
  updateLivingTypeRecipe,
} from "./living-type-recipe";
export type { FontStatus } from "./living-type-mask";
export type {
  LivingTypeColors,
  LivingTypeMaterial,
  LivingTypePresetId,
  LivingTypeRecipe,
  LivingTypeRecipeOptions,
  ReducedMotionPreference,
  RecipeIssue,
  RecipeParseResult,
} from "./living-type-recipe";
