"use client";

import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from "react";
import waveData from "./waves.json";
import styles from "./pearl-caustics.module.css";

export type PearlCausticsPreset =
  | "pearl-wash"
  | "spectral-caustics"
  | "nacre-light";

export type PearlCausticsSurface = "plaster" | "dusk";
export type PearlCausticsMotion = "auto" | "full" | "reduced";

export interface PearlCausticsTuning {
  speed: number;
  intensity: number;
  scale: number;
  spectral: number;
  nacre: number;
  warmth: number;
  softness: number;
  pointerStrength: number;
}

export interface PearlCausticsPresetDefinition {
  id: PearlCausticsPreset;
  label: string;
  index: number;
  note: string;
  tuning: PearlCausticsTuning;
}

export interface PearlCausticsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** Named preset. Individual tuning props override that preset's values. */
  preset?: PearlCausticsPreset;
  /** The matte ground the refracted light is projected onto. */
  surface?: PearlCausticsSurface;
  /** Optional overrides for the active preset. */
  speed?: number;
  intensity?: number;
  scale?: number;
  spectral?: number;
  nacre?: number;
  warmth?: number;
  softness?: number;
  pointerStrength?: number;
  /** Freeze the current frame. Pointer interaction is suspended while paused. */
  paused?: boolean;
  /** `auto` honours the operating system's reduced-motion preference. */
  motion?: PearlCausticsMotion;
  /**
   * Base loop length in seconds. The ambient field is an exact periodic
   * function of this duration when speed is 1. Values are clamped to 4–60.
   */
  loopSeconds?: number;
  /**
   * Initial normalized phase, 0–1. `1` is accepted for deterministic loop
   * seam review and is equivalent to `0` because every time-dependent shader
   * input is periodic. This is an initial value, not a live transport control.
   */
  startPhase?: number;
  /** Set false to disable pointer and touch input (export / capture mode). */
  interactive?: boolean;
  /** Render the final composition as luminance for geometry review. */
  monochrome?: boolean;
  /** Called after the first successful WebGL frame. */
  onReady?: () => void;
  /**
   * Receives the render state: WebGL on success, software-still when a
   * software rasteriser is detected, fallback on context loss or missing
   * WebGL. Useful for keeping surrounding UI truthful.
   */
  onRenderStateChange?: (
    state: "webgl" | "software-still" | "fallback",
  ) => void;
}

interface WaveDatum {
  kx: number;
  ky: number;
  amp: number;
  harmonic: number;
  phase: number;
}

interface WaveFile {
  loopSeconds: number;
  cubic: number;
  lowWaves: number;
  waves: WaveDatum[];
}

const WAVE_FILE = waveData as WaveFile;

/**
 * The heightfield is a finite sum of directional waves. Every temporal term is
 * an integer multiple of `2π / loopSeconds`, so the ambient field is exactly
 * periodic and C∞ at the seam. Changing `speed` scales the loop duration
 * (loopSeconds / speed); it never introduces a non-integer frequency.
 */
export const PEARL_LOOP_SECONDS = WAVE_FILE.loopSeconds;
export const PEARL_WAVE_COUNT = WAVE_FILE.waves.length;

export const PEARL_CAUSTICS_PRESETS: readonly PearlCausticsPresetDefinition[] = [
  {
    id: "pearl-wash",
    label: "Pearl Wash",
    index: 0,
    note: "Broad cellular light, low contrast, a quiet silver body.",
    tuning: {
      speed: 1,
      intensity: 0.88,
      scale: 0.95,
      spectral: 0.36,
      nacre: 0.58,
      warmth: 0.16,
      softness: 0.8,
      pointerStrength: 0.9,
    },
  },
  {
    id: "spectral-caustics",
    label: "Spectral Caustics",
    index: 1,
    note: "Tighter folds with restrained edge dispersion.",
    tuning: {
      speed: 1,
      intensity: 1,
      scale: 1.12,
      spectral: 0.9,
      nacre: 0.15,
      warmth: -0.28,
      softness: 0.18,
      pointerStrength: 1.05,
    },
  },
  {
    id: "nacre-light",
    label: "Nacre Light",
    index: 2,
    note: "Milky silver body with a warm pearl bloom.",
    tuning: {
      speed: 1,
      intensity: 0.9,
      scale: 1,
      spectral: 0.22,
      nacre: 0.95,
      warmth: 0.36,
      softness: 0.55,
      pointerStrength: 0.75,
    },
  },
] as const;

export const DEFAULT_PEARL_CAUSTICS_PRESET: PearlCausticsPreset = "pearl-wash";

const PRESET_BY_ID = new Map(
  PEARL_CAUSTICS_PRESETS.map((preset) => [preset.id, preset]),
);

const MAX_PIXEL_RATIO = 2.0;
const FIELD_TARGET_PIXELS = 2_000_000;
const FIELD_MAX_SCALE = 1.0;
const MIN_LOOP_SECONDS = 4;
const MAX_LOOP_SECONDS = 60;
const STATIC_PHASE = 0;

const VERTEX_SHADER = /* glsl */ `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const WAVE_CALLS = WAVE_FILE.waves
  .map((wave, index) => {
    const lowWeight = index < WAVE_FILE.lowWaves ? "1.0" : "0.0";
    return `  addWave(q, u_phase, vec2(${wave.kx.toFixed(6)}, ${wave.ky.toFixed(
      6,
    )}), ${wave.amp.toFixed(7)}, ${wave.harmonic.toFixed(
      1,
    )}, ${wave.phase.toFixed(6)}, ${lowWeight}, f);`;
  })
  .join("\n");

function fieldFragmentShader(hasDerivatives: boolean): string {
  return /* glsl */ `${
    hasDerivatives ? "#extension GL_OES_standard_derivatives : enable\n" : ""
  }
  precision highp float;

  varying vec2 v_uv;

  uniform float u_phase;
  uniform vec2 u_resolution;
  uniform float u_scale;
  uniform float u_softness;
  uniform float u_spectral;

  #define TAU 6.28318530718
  #define CUBIC ${WAVE_FILE.cubic.toFixed(4)}

  struct WaveField {
    float h;
    float hLow;
    vec2 grad;
    float hxx;
    float hxy;
    float hyy;
  };

  // One coherent wave component. The cubic term sharpens crests and flattens
  // troughs without adding a second trigonometric evaluation. All derivatives
  // below are analytic, which lets a single sin/cos pair drive the height, the
  // surface normal, and the 2x2 mapping Jacobian.
  void addWave(
    vec2 p,
    float phase,
    vec2 k,
    float amp,
    float harmonic,
    float phi,
    float lowWeight,
    inout WaveField f
  ) {
    float ph = dot(k, p) + TAU * harmonic * phase + phi;
    float s = sin(ph);
    float c = cos(ph);
    float q = 1.0 + 3.0 * CUBIC * s * s;
    float q2 = -s * q + 6.0 * CUBIC * s * c * c;
    float shaped = s + CUBIC * s * s * s;

    f.h += amp * shaped;
    f.hLow += amp * shaped * lowWeight;
    f.grad += amp * k * c * q;
    f.hxx += amp * k.x * k.x * q2;
    f.hxy += amp * k.x * k.y * q2;
    f.hyy += amp * k.y * k.y * q2;
  }

  // A fixed, low-amplitude optical irregularity. It is independent of time, so
  // it cannot break the loop; it only keeps the wave sum from reading as a
  // regular interference lattice.
  vec2 staticWarp(vec2 p) {
    return vec2(
      sin(p.y * 1.9 + 1.3) + 0.55 * sin(p.x * 2.7 - 0.8),
      sin(p.x * 1.6 - 2.1) + 0.55 * sin(p.y * 2.4 + 0.6)
    ) * 0.085;
  }

  // Light concentration from the differential area of the refracted mapping:
  // I ∝ 1 / |det J| with J = I + depth * Hessian(h). The baseline subtraction
  // keeps the unrefracted matte surface at zero caustic light.
  float focusLight(float det, float eps, float gain) {
    float focus = 1.0 / (abs(det) + eps);
    float baseline = 1.0 / (1.0 + eps);
    float excess = max(0.0, focus - baseline);
    return 1.0 - exp(-gain * excess);
  }

  void main() {
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0) * u_scale;
    vec2 q = p + staticWarp(p);

    WaveField f;
    f.h = 0.0;
    f.hLow = 0.0;
    f.grad = vec2(0.0);
    f.hxx = 0.0;
    f.hxy = 0.0;
    f.hyy = 0.0;

${WAVE_CALLS}

    float soft = smoothstep(0.0, 1.0, u_softness);
    float eps = mix(0.030, 0.078, soft);
    float gain = mix(1.10, 0.62, soft);
    float dispersion = mix(0.012, 0.05, u_spectral);
    float depth = 0.95;

    float dR = depth * (1.0 - dispersion);
    float dG = depth;
    float dB = depth * (1.0 + dispersion);

    float detR =
      (1.0 + dR * f.hxx) * (1.0 + dR * f.hyy) -
      (dR * f.hxy) * (dR * f.hxy);
    float detG =
      (1.0 + dG * f.hxx) * (1.0 + dG * f.hyy) -
      (dG * f.hxy) * (dG * f.hxy);
    float detB =
      (1.0 + dB * f.hxx) * (1.0 + dB * f.hyy) -
      (dB * f.hxy) * (dB * f.hxy);

    #ifdef GL_OES_standard_derivatives
      // Keep the narrowest ridges at least one field texel wide. The field is
      // rendered below display resolution, so this is cheap analytic AA.
      eps = max(eps, fwidth(detG) * 0.55);
    #endif

    float broadEps = eps * 2.6 + 0.025;
    float broadGain = gain * 0.28;

    float lightR = mix(
      focusLight(detR, eps, gain),
      focusLight(detR, broadEps, broadGain),
      0.10
    );
    float lightG = mix(
      focusLight(detG, eps, gain),
      focusLight(detG, broadEps, broadGain),
      0.10
    );
    float lightB = mix(
      focusLight(detB, eps, gain),
      focusLight(detB, broadEps, broadGain),
      0.10
    );

    lightR = pow(clamp(lightR, 0.0, 1.0), 1.18);
    lightG = pow(clamp(lightG, 0.0, 1.0), 1.18);
    lightB = pow(clamp(lightB, 0.0, 1.0), 1.18);

    // A slow low-frequency gate gives the network natural bright and dim
    // regions instead of a uniform field of identical filaments.
    float gate = smoothstep(-0.38, 0.38, f.hLow);

    gl_FragColor = vec4(lightR, lightG, lightB, gate);
  }
`;
}

const COMPOSITE_FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  varying vec2 v_uv;

  uniform sampler2D u_field;
  uniform vec2 u_resolution;
  uniform vec2 u_field_texel;
  uniform float u_phase;
  uniform float u_intensity;
  uniform float u_softness;
  uniform float u_spectral;
  uniform float u_nacre;
  uniform float u_warmth;
  uniform float u_surface;
  uniform float u_monochrome;
  uniform float u_pointer_strength;
  uniform vec2 u_pointer;
  uniform vec2 u_pointer_velocity;

  #define TAU 6.28318530718

  mat2 rotate2d(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
  }

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float value_noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash12(i);
    float b = hash12(i + vec2(1.0, 0.0));
    float c = hash12(i + vec2(0.0, 1.0));
    float d = hash12(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm2(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float total = 0.0;
    for (int i = 0; i < 2; i++) {
      value += amplitude * value_noise(p);
      total += amplitude;
      p = p * 2.07 + vec2(-5.4, 8.1);
      amplitude *= 0.5;
    }
    return value / total;
  }

  vec3 pearl_palette(float hue) {
    float h = fract(hue);
    vec3 cool = vec3(0.685, 0.785, 0.870);
    vec3 champagne = vec3(0.910, 0.835, 0.710);
    vec3 blush = vec3(0.895, 0.760, 0.725);
    vec3 mint = vec3(0.725, 0.845, 0.805);

    vec4 anchors = vec4(0.0, 0.25, 0.50, 0.75);
    vec4 distances = abs(fract(h - anchors + 0.5) - 0.5);
    vec4 weights = max(vec4(0.0), 1.0 - distances * 4.0);
    vec3 palette =
      cool * weights.x +
      champagne * weights.y +
      blush * weights.z +
      mint * weights.w;

    vec3 warm = vec3(0.965, 0.815, 0.650);
    vec3 cold = vec3(0.605, 0.785, 0.955);
    vec3 temperature = mix(cold, warm, step(0.0, u_warmth));
    palette = mix(palette, temperature, abs(u_warmth) * 0.20);
    palette = mix(
      vec3(0.825, 0.825, 0.805),
      palette,
      0.53 + u_spectral * 0.34
    );
    palette = mix(palette, vec3(0.900, 0.865, 0.800), u_nacre * 0.26);
    return clamp(palette, 0.0, 1.0);
  }

  void main() {
    float aspect = u_resolution.x / max(u_resolution.y, 1.0);
    vec2 p = (v_uv - 0.5) * vec2(aspect, 1.0);

    // The pointer is a transient optical disturbance, not part of the ambient
    // field. It warps the projected light locally and never touches the clock.
    vec2 pointer = (u_pointer - 0.5) * vec2(aspect, 1.0);
    vec2 toPointer = p - pointer;
    float pointerDistance = length(toPointer);
    vec2 pointerDir = toPointer / max(pointerDistance, 0.0001);
    float pointerSpeed = length(u_pointer_velocity);
    float proximity =
      exp(-pointerDistance * pointerDistance * 15.0) *
      clamp(u_pointer_strength, 0.0, 1.35);

    vec2 fieldUv = v_uv;
    fieldUv +=
      (
        pointerDir * (0.004 + min(pointerSpeed, 1.5) * 0.012) +
        vec2(-pointerDir.y, pointerDir.x) * 0.003
      ) * proximity;
    fieldUv = clamp(fieldUv, u_field_texel * 0.5, 1.0 - u_field_texel * 0.5);

    // Four small taps hide the low-resolution field texel grid and soften the
    // narrow ridges without smearing the filament topology.
    vec2 tap = u_field_texel * mix(0.65, 1.55, u_softness);
    vec4 field =
      (
        texture2D(u_field, fieldUv + vec2(tap.x, 0.0)) +
        texture2D(u_field, fieldUv - vec2(tap.x, 0.0)) +
        texture2D(u_field, fieldUv + vec2(0.0, tap.y)) +
        texture2D(u_field, fieldUv - vec2(0.0, tap.y))
      ) * 0.25;

    vec3 caustic = field.rgb;
    float gate = field.a;
    float average = dot(caustic, vec3(0.3333333));
    float gateMask = mix(0.62, 1.0, smoothstep(0.08, 0.92, gate));

    // Projected pool: the light has an off-centre source and dies at the edges.
    vec2 poolP = rotate2d(0.28) * (p - vec2(0.11, 0.03));
    float poolDistance = length(poolP * vec2(0.82, 1.18));
    float pool = 1.0 - smoothstep(0.20, 0.98, poolDistance);
    pool = smoothstep(0.0, 0.70, pool);
    float spill = 1.0 - smoothstep(0.30, 1.34, poolDistance);
    float poolGain = 0.12 + 0.88 * pool;

    float hue =
      0.5 +
      0.5 * sin(dot(p, vec2(0.83, 0.57)) * 1.45 + TAU * u_phase + 1.7);
    vec3 pearl = pearl_palette(hue);
    vec3 silver = vec3(1.0, 0.984, 0.955);
    vec3 lightTint = mix(
      silver,
      pearl,
      0.18 + u_nacre * 0.28 + max(u_spectral, 0.0) * 0.10
    );

    float cloud = fbm2(v_uv * vec2(26.0, 33.0) + 4.0);
    float grain = hash12(gl_FragCoord.xy * 0.85 + 17.0) - 0.5;
    float fiber = value_noise(gl_FragCoord.xy * 0.32 + 4.0) - 0.5;

    vec3 paper = vec3(0.806, 0.790, 0.752);
    paper = mix(
      paper,
      vec3(0.824, 0.804, 0.760),
      max(u_warmth, 0.0) * 0.35 + u_nacre * 0.22
    );
    paper = mix(paper, vec3(0.788, 0.786, 0.774), max(-u_warmth, 0.0) * 0.30);
    paper *= 1.0 + grain * 0.015 + (cloud - 0.5) * 0.028;
    paper *= 0.918 + pool * 0.060 + spill * 0.014;
    paper += mix(vec3(0.98, 0.97, 0.94), pearl, 0.5) * pool * 0.012;
    paper += fiber * 0.006;
    // The unlit plaster is a touch cooler than the light it receives.
    paper = mix(
      paper,
      paper * vec3(0.958, 0.968, 1.0),
      smoothstep(0.25, 1.15, poolDistance) * 0.40
    );

    float lightAmount = average * gateMask * poolGain * u_intensity;
    vec3 chroma = caustic - vec3(average);
    vec3 causticColor =
      lightTint * average + chroma * (0.18 + max(u_spectral, 0.0) * 0.65);

    // A soft shoulder keeps the brightest folds silvery instead of clipping
    // to a flat white; the pearl hierarchy survives the highlight.
    vec3 causticSoft = causticColor / (1.0 + causticColor * 0.10);

    vec3 lightSurface = paper;
    lightSurface *= 1.0 - clamp(lightAmount, 0.0, 1.0) * 0.022;
    lightSurface += causticSoft * gateMask * poolGain * u_intensity * 0.30;
    lightSurface +=
      lightTint *
      pow(clamp(average, 0.0, 1.0), 3.0) *
      0.040 *
      gateMask *
      poolGain *
      u_intensity;
    lightSurface += pearl * pool * 0.010 * (0.35 + u_spectral);
    lightSurface +=
      lightTint * proximity * 0.016 * (0.5 + min(pointerSpeed, 1.4));

    // Nacre is a material bias, not a white veil over the whole image.
    vec3 nacreMilk = vec3(0.923, 0.900, 0.842) * (0.96 + pool * 0.04);
    nacreMilk += lightTint * (0.008 + average * 0.012);
    lightSurface = mix(lightSurface, nacreMilk, u_nacre * 0.085);

    lightSurface *= 0.938 + 0.062 * smoothstep(1.22, 0.30, poolDistance);

    vec3 dusk = vec3(0.033, 0.043, 0.046);
    dusk += vec3(-p.x * 0.012, p.y * 0.010, p.y * 0.014);
    dusk += grain * 0.003;
    dusk += vec3(0.006, 0.009, 0.010) * mix(0.30, 1.0, pool);

    vec3 duskLight = mix(lightTint, pearl, 0.30);
    vec3 duskSurface = dusk;
    duskSurface +=
      duskLight * causticSoft * gateMask * poolGain * u_intensity * 0.72;
    duskSurface +=
      silver *
      pow(clamp(average, 0.0, 1.0), 2.0) *
      0.060 *
      gateMask *
      u_intensity;
    duskSurface += duskLight * pool * 0.030;
    duskSurface += duskLight * pow(pool, 2.0) * 0.015;
    duskSurface += duskLight * proximity * 0.020;
    duskSurface *= mix(0.86, 1.0, smoothstep(1.30, 0.25, poolDistance));

    vec3 color = mix(
      lightSurface,
      duskSurface,
      smoothstep(0.2, 0.8, u_surface)
    );

    // The same geometry, read without colour. This mode is for art review and
    // for proving the caustics do not depend on chromatic decoration.
    color = mix(
      color,
      vec3(dot(color, vec3(0.2126, 0.7152, 0.0722))),
      clamp(u_monochrome, 0.0, 1.0)
    );

    color += (hash12(gl_FragCoord.xy + 3.7) - 0.5) / 255.0;
    color = clamp(color, 0.0, 1.0);
    gl_FragColor = vec4(color, 1.0);
  }
`;

interface EngineParams extends PearlCausticsTuning {
  surface: number;
  loopSeconds: number;
  initialPhase: number;
  interactive: boolean;
  monochrome: number;
}

interface EngineCallbacks {
  onReady: (softwareStill: boolean) => void;
  onFailure: () => void;
  onRestore: () => void;
}

interface EngineHandle {
  setParams: (params: EngineParams) => void;
  start: () => void;
  stop: () => void;
  drawStill: () => void;
  destroy: () => void;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveTuning(
  preset: PearlCausticsPreset,
  overrides: Partial<PearlCausticsTuning>,
): PearlCausticsTuning {
  const definition = PRESET_BY_ID.get(preset) ?? PEARL_CAUSTICS_PRESETS[0];
  const base = definition.tuning;
  return {
    speed: clamp(overrides.speed ?? base.speed, 0, 2),
    intensity: clamp(overrides.intensity ?? base.intensity, 0, 1.6),
    scale: clamp(overrides.scale ?? base.scale, 0.55, 1.85),
    spectral: clamp(overrides.spectral ?? base.spectral, 0, 1),
    nacre: clamp(overrides.nacre ?? base.nacre, 0, 1),
    warmth: clamp(overrides.warmth ?? base.warmth, -1, 1),
    softness: clamp(overrides.softness ?? base.softness, 0, 1),
    pointerStrength: clamp(
      overrides.pointerStrength ?? base.pointerStrength,
      0,
      1.6,
    ),
  };
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn(
      "Pearl Caustics shader compilation failed.",
      gl.getShaderInfoLog(shader),
    );
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(
  gl: WebGLRenderingContext,
  fragmentSource: string,
): WebGLProgram | null {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();

  if (!vertex || !fragment || !program) {
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    if (program) gl.deleteProgram(program);
    return null;
  }

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn(
      "Pearl Caustics program link failed.",
      gl.getProgramInfoLog(program),
    );
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

function createEngine(
  canvas: HTMLCanvasElement,
  initialParams: EngineParams,
  callbacks: EngineCallbacks,
): EngineHandle | null {
  const gl = canvas.getContext("webgl", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  });

  if (!gl || gl.isContextLost()) {
    callbacks.onFailure();
    return null;
  }

  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const rendererName = debugInfo
    ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
    : String(gl.getParameter(gl.RENDERER));
  const softwareStill = /swiftshader|llvmpipe|software rasteri[sz]er|software/i.test(
    rendererName,
  );

  const hasDerivatives = Boolean(
    gl.getExtension("OES_standard_derivatives"),
  );

  const fieldProgram = createProgram(gl, fieldFragmentShader(hasDerivatives));
  const compositeProgram = createProgram(gl, COMPOSITE_FRAGMENT_SHADER);

  if (!fieldProgram || !compositeProgram) {
    if (fieldProgram) gl.deleteProgram(fieldProgram);
    if (compositeProgram) gl.deleteProgram(compositeProgram);
    callbacks.onFailure();
    return null;
  }

  const buffer = gl.createBuffer();
  const fieldTexture = gl.createTexture();
  const framebuffer = gl.createFramebuffer();

  if (!buffer || !fieldTexture || !framebuffer) {
    if (buffer) gl.deleteBuffer(buffer);
    if (fieldTexture) gl.deleteTexture(fieldTexture);
    if (framebuffer) gl.deleteFramebuffer(framebuffer);
    gl.deleteProgram(fieldProgram);
    gl.deleteProgram(compositeProgram);
    callbacks.onFailure();
    return null;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  const fieldPosition = gl.getAttribLocation(fieldProgram, "a_position");
  const compositePosition = gl.getAttribLocation(
    compositeProgram,
    "a_position",
  );

  const fieldUniforms = {
    phase: gl.getUniformLocation(fieldProgram, "u_phase"),
    resolution: gl.getUniformLocation(fieldProgram, "u_resolution"),
    scale: gl.getUniformLocation(fieldProgram, "u_scale"),
    softness: gl.getUniformLocation(fieldProgram, "u_softness"),
    spectral: gl.getUniformLocation(fieldProgram, "u_spectral"),
  };

  const compositeUniforms = {
    field: gl.getUniformLocation(compositeProgram, "u_field"),
    resolution: gl.getUniformLocation(compositeProgram, "u_resolution"),
    fieldTexel: gl.getUniformLocation(compositeProgram, "u_field_texel"),
    phase: gl.getUniformLocation(compositeProgram, "u_phase"),
    intensity: gl.getUniformLocation(compositeProgram, "u_intensity"),
    softness: gl.getUniformLocation(compositeProgram, "u_softness"),
    spectral: gl.getUniformLocation(compositeProgram, "u_spectral"),
    nacre: gl.getUniformLocation(compositeProgram, "u_nacre"),
    warmth: gl.getUniformLocation(compositeProgram, "u_warmth"),
    surface: gl.getUniformLocation(compositeProgram, "u_surface"),
    monochrome: gl.getUniformLocation(compositeProgram, "u_monochrome"),
    pointerStrength: gl.getUniformLocation(
      compositeProgram,
      "u_pointer_strength",
    ),
    pointer: gl.getUniformLocation(compositeProgram, "u_pointer"),
    pointerVelocity: gl.getUniformLocation(
      compositeProgram,
      "u_pointer_velocity",
    ),
  };

  let params = initialParams;
  let running = false;
  let destroyed = false;
  let frameRequest = 0;
  let lastFrame = 0;
  let width = 0;
  let height = 0;
  let fieldWidth = 0;
  let fieldHeight = 0;
  let ambientTime =
    clamp(initialParams.initialPhase, 0, 1) *
    Math.max(initialParams.loopSeconds, MIN_LOOP_SECONDS);
  let pointerX = 0.56;
  let pointerY = 0.52;
  let pointerVelocityX = 0;
  let pointerVelocityY = 0;
  let pointerStrength = 0;
  let pointerTarget = 0;
  let lastPointerMove = 0;
  let ready = false;
  let contextWasLost = false;

  const allocateField = (nextWidth: number, nextHeight: number): boolean => {
    fieldWidth = nextWidth;
    fieldHeight = nextHeight;
    gl.bindTexture(gl.TEXTURE_2D, fieldTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      fieldWidth,
      fieldHeight,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      fieldTexture,
      0,
    );
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    canvas.dataset.fieldWidth = String(fieldWidth);
    canvas.dataset.fieldHeight = String(fieldHeight);
    return status === gl.FRAMEBUFFER_COMPLETE;
  };

  const draw = () => {
    if (destroyed || !ready || gl.isContextLost()) return;
    if (width === 0 || height === 0 || fieldWidth === 0) return;

    const loop = Math.max(params.loopSeconds, MIN_LOOP_SECONDS);
    const phase = ambientTime / loop;

    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);

    // 1. Light-field pass at the reduced internal resolution.
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.viewport(0, 0, fieldWidth, fieldHeight);
    gl.useProgram(fieldProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(fieldPosition);
    gl.vertexAttribPointer(fieldPosition, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(fieldUniforms.phase, phase);
    gl.uniform2f(fieldUniforms.resolution, fieldWidth, fieldHeight);
    gl.uniform1f(fieldUniforms.scale, params.scale);
    gl.uniform1f(fieldUniforms.softness, params.softness);
    gl.uniform1f(fieldUniforms.spectral, params.spectral);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 2. Matte-surface composite at display resolution.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, width, height);
    gl.useProgram(compositeProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(compositePosition);
    gl.vertexAttribPointer(compositePosition, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, fieldTexture);
    gl.uniform1i(compositeUniforms.field, 0);
    gl.uniform2f(compositeUniforms.resolution, width, height);
    gl.uniform2f(
      compositeUniforms.fieldTexel,
      1 / fieldWidth,
      1 / fieldHeight,
    );
    gl.uniform1f(compositeUniforms.phase, phase);
    gl.uniform1f(compositeUniforms.intensity, params.intensity);
    gl.uniform1f(compositeUniforms.softness, params.softness);
    gl.uniform1f(compositeUniforms.spectral, params.spectral);
    gl.uniform1f(compositeUniforms.nacre, params.nacre);
    gl.uniform1f(compositeUniforms.warmth, params.warmth);
    gl.uniform1f(compositeUniforms.surface, params.surface);
    gl.uniform1f(compositeUniforms.monochrome, params.monochrome);
    gl.uniform1f(compositeUniforms.pointerStrength, pointerStrength * 0.96);
    gl.uniform2f(compositeUniforms.pointer, pointerX, pointerY);
    gl.uniform2f(
      compositeUniforms.pointerVelocity,
      pointerVelocityX * 0.12,
      pointerVelocityY * 0.12,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };

  const resize = () => {
    if (destroyed) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const nextWidth = Math.max(1, Math.round(rect.width * ratio));
    const nextHeight = Math.max(1, Math.round(rect.height * ratio));
    const nextFieldScale = Math.min(
      FIELD_MAX_SCALE,
      Math.sqrt(FIELD_TARGET_PIXELS / (nextWidth * nextHeight)),
    );
    const nextFieldWidth = Math.max(
      64,
      Math.round(nextWidth * nextFieldScale),
    );
    const nextFieldHeight = Math.max(
      64,
      Math.round(nextHeight * nextFieldScale),
    );

    if (nextWidth !== width || nextHeight !== height) {
      width = nextWidth;
      height = nextHeight;
      canvas.width = width;
      canvas.height = height;
    }

    if (nextFieldWidth !== fieldWidth || nextFieldHeight !== fieldHeight) {
      if (!allocateField(nextFieldWidth, nextFieldHeight)) {
        callbacks.onFailure();
        return;
      }
    }

    if (!running) draw();
  };

  const tick = (now: number) => {
    if (!running || destroyed) return;
    const dt = clamp((now - lastFrame) / 1000, 0, 0.1);
    lastFrame = now;
    const loop = Math.max(params.loopSeconds, MIN_LOOP_SECONDS);
    if (dt > 0 && params.speed > 0) {
      ambientTime = (ambientTime + dt * params.speed) % loop;
      if (ambientTime < 0) ambientTime += loop;
    }

    if (now - lastPointerMove > 120) pointerTarget = 0;
    pointerStrength +=
      (pointerTarget - pointerStrength) * Math.min(1, dt * 4.2);
    pointerVelocityX *= Math.exp(-dt * 3.6);
    pointerVelocityY *= Math.exp(-dt * 3.6);
    if (pointerStrength < 0.001 && pointerTarget === 0) pointerStrength = 0;

    draw();
    frameRequest = window.requestAnimationFrame(tick);
  };

  const start = () => {
    if (destroyed || running || !ready) return;
    if (softwareStill) {
      // A CPU rasteriser cannot sustain a pleasant frame rate. Keep the
      // rendered still rather than shipping judder; preset/parameter changes
      // still redraw through setParams().
      draw();
      return;
    }
    running = true;
    pointerTarget = 0;
    pointerStrength = 0;
    pointerVelocityX = 0;
    pointerVelocityY = 0;
    lastFrame = performance.now();
    frameRequest = window.requestAnimationFrame(tick);
  };

  const stop = () => {
    running = false;
    if (frameRequest) {
      window.cancelAnimationFrame(frameRequest);
      frameRequest = 0;
    }
    pointerTarget = 0;
    pointerStrength = 0;
    pointerVelocityX = 0;
    pointerVelocityY = 0;
    draw();
  };

  const drawStill = () => {
    if (running) return;
    ambientTime =
      clamp(params.initialPhase, 0, 1) *
      Math.max(params.loopSeconds, MIN_LOOP_SECONDS);
    draw();
  };

  const pointerMove = (event: PointerEvent) => {
    if (!running || destroyed || !params.interactive) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const nextX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const nextY = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
    const now = performance.now();
    const dt = Math.max(0.001, (now - lastPointerMove) / 1000);
    const movement = Math.hypot(nextX - pointerX, nextY - pointerY);
    const speed = clamp(movement / dt, 0, 3.2);
    const strengthGain = clamp(params.pointerStrength / 1.05, 0, 1.5);
    pointerVelocityX =
      pointerVelocityX * 0.6 + ((nextX - pointerX) / dt) * 0.4;
    pointerVelocityY =
      pointerVelocityY * 0.6 + ((nextY - pointerY) / dt) * 0.4;
    pointerX = nextX;
    pointerY = nextY;
    pointerTarget = clamp(0.54 + speed * 0.36, 0.4, 1) * strengthGain;
    pointerStrength = Math.max(pointerStrength, pointerTarget * 0.72);
    lastPointerMove = now;
  };

  const pointerDown = (event: PointerEvent) => {
    if (!running || !params.interactive) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointerX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    pointerY = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
    pointerTarget = clamp(params.pointerStrength * 0.75, 0.3, 1.2);
    pointerStrength = Math.max(pointerStrength, pointerTarget * 0.8);
    lastPointerMove = performance.now();
  };

  const pointerLeave = () => {
    pointerTarget = 0;
    lastPointerMove = 0;
  };

  const contextLost = (event: Event) => {
    event.preventDefault();
    contextWasLost = true;
    running = false;
    if (frameRequest) {
      window.cancelAnimationFrame(frameRequest);
      frameRequest = 0;
    }
    ready = false;
    callbacks.onFailure();
  };

  const contextRestored = () => {
    callbacks.onRestore();
  };

  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointerleave", pointerLeave);
  canvas.addEventListener("pointercancel", pointerLeave);
  canvas.addEventListener("webglcontextlost", contextLost);
  canvas.addEventListener("webglcontextrestored", contextRestored);
  window.addEventListener("resize", resize);

  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => {
          resize();
        });
  resizeObserver?.observe(canvas);

  resize();
  if (fieldWidth === 0 || fieldHeight === 0) {
    callbacks.onFailure();
    return null;
  }

  ready = true;
  draw();
  callbacks.onReady(softwareStill);

  return {
    setParams(nextParams) {
      if (destroyed) return;
      const wasInteractive = params.interactive;
      params = nextParams;
      if (wasInteractive && !params.interactive) {
        pointerTarget = 0;
        pointerStrength = 0;
        pointerVelocityX = 0;
        pointerVelocityY = 0;
      }
      const loop = Math.max(params.loopSeconds, MIN_LOOP_SECONDS);
      if (ambientTime >= loop) ambientTime %= loop;
      if (!running) draw();
    },
    start,
    stop,
    drawStill,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      running = false;
      if (frameRequest) window.cancelAnimationFrame(frameRequest);
      frameRequest = 0;
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerdown", pointerDown);
      canvas.removeEventListener("pointerleave", pointerLeave);
      canvas.removeEventListener("pointercancel", pointerLeave);
      canvas.removeEventListener("webglcontextlost", contextLost);
      canvas.removeEventListener("webglcontextrestored", contextRestored);
      // After a lost/restored context the old handles are invalid. Deleting
      // them would produce INVALID_OPERATION warnings and cannot help the new
      // context, so leave them to the driver.
      if (contextWasLost || gl.isContextLost()) return;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.bindTexture(gl.TEXTURE_2D, null);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(fieldTexture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(fieldProgram);
      gl.deleteProgram(compositeProgram);
    },
  };
}

export const PearlCaustics = forwardRef<HTMLDivElement, PearlCausticsProps>(
  function PearlCaustics(
    {
      preset = DEFAULT_PEARL_CAUSTICS_PRESET,
      surface = "plaster",
      speed,
      intensity,
      scale,
      spectral,
      nacre,
      warmth,
      softness,
      pointerStrength,
      paused = false,
      motion = "auto",
      loopSeconds = PEARL_LOOP_SECONDS,
      startPhase = STATIC_PHASE,
      interactive = true,
      monochrome = false,
      onReady,
      onRenderStateChange,
      className,
      style,
      role = "img",
      "aria-label": ariaLabel = "Pearl caustics: a slow twelve-second loop of pearlescent water light across a matte surface.",
      ...rest
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<EngineHandle | null>(null);
    const onReadyRef = useRef(onReady);
    onReadyRef.current = onReady;
    const onRenderStateChangeRef = useRef(onRenderStateChange);
    onRenderStateChangeRef.current = onRenderStateChange;

    const [ready, setReady] = useState(false);
    const [failed, setFailed] = useState(false);
    const [softwareStill, setSoftwareStill] = useState(false);
    const [generation, setGeneration] = useState(0);
    const [inView, setInView] = useState(true);
    const [pageVisible, setPageVisible] = useState(true);
    const [systemReduced, setSystemReduced] = useState(() => {
      if (typeof window === "undefined") return false;
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    });

    const tuning = useMemo(
      () =>
        resolveTuning(preset, {
          speed,
          intensity,
          scale,
          spectral,
          nacre,
          warmth,
          softness,
          pointerStrength,
        }),
      [
        preset,
        speed,
        intensity,
        scale,
        spectral,
        nacre,
        warmth,
        softness,
        pointerStrength,
      ],
    );

    const resolvedLoopSeconds = clamp(
      loopSeconds,
      MIN_LOOP_SECONDS,
      MAX_LOOP_SECONDS,
    );

    const engineParams = useMemo<EngineParams>(
      () => ({
        ...tuning,
        surface: surface === "dusk" ? 1 : 0,
        loopSeconds: resolvedLoopSeconds,
        initialPhase: clamp(startPhase, 0, 1),
        interactive,
        monochrome: monochrome ? 1 : 0,
      }),
      [
        tuning,
        surface,
        resolvedLoopSeconds,
        startPhase,
        interactive,
        monochrome,
      ],
    );

    const initialParamsRef = useRef(engineParams);
    initialParamsRef.current = engineParams;

    const effectiveMotion: PearlCausticsMotion =
      motion === "auto" ? (systemReduced ? "reduced" : "full") : motion;
    const shouldAnimate =
      effectiveMotion === "full" && !paused && inView && pageVisible && !failed;

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const engine = createEngine(canvas, initialParamsRef.current, {
        onReady: (isSoftwareStill) => {
          setFailed(false);
          setReady(true);
          setSoftwareStill(isSoftwareStill);
          onRenderStateChangeRef.current?.(
            isSoftwareStill ? "software-still" : "webgl",
          );
          onReadyRef.current?.();
        },
        onFailure: () => {
          setFailed(true);
          setReady(false);
          setSoftwareStill(false);
          onRenderStateChangeRef.current?.("fallback");
        },
        onRestore: () => {
          setFailed(false);
          setReady(false);
          setGeneration((value) => value + 1);
        },
      });
      engineRef.current = engine;

      return () => {
        engineRef.current = null;
        engine?.destroy();
      };
      // The engine is intentionally created once per context generation. Live
      // props are pushed into it by the update effect below.
    }, [generation]);

    useEffect(() => {
      engineRef.current?.setParams(engineParams);
    }, [engineParams]);

    useEffect(() => {
      const engine = engineRef.current;
      if (!engine || !ready || failed) return;
      if (shouldAnimate) {
        engine.start();
        return;
      }
      engine.stop();
      if (effectiveMotion === "reduced") engine.drawStill();
    }, [shouldAnimate, effectiveMotion, ready, failed, generation]);

    useEffect(() => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      const update = () => setSystemReduced(query.matches);
      update();
      query.addEventListener("change", update);
      return () => query.removeEventListener("change", update);
    }, []);

    useEffect(() => {
      const updateVisibility = () => setPageVisible(!document.hidden);
      updateVisibility();
      document.addEventListener("visibilitychange", updateVisibility);
      return () =>
        document.removeEventListener("visibilitychange", updateVisibility);
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || typeof IntersectionObserver === "undefined") return;
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry) setInView(entry.isIntersecting);
        },
        { rootMargin: "120px 0px", threshold: 0.01 },
      );
      observer.observe(canvas);
      return () => observer.disconnect();
    }, []);

    const mergedStyle = {
      ...style,
    } as CSSProperties;

    return (
      <div
        {...rest}
        ref={ref}
        role={role}
        aria-label={ariaLabel}
        className={[
          styles.root,
          surface === "dusk" ? styles.dusk : styles.plaster,
          failed ? styles.failed : "",
          className ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={mergedStyle}
        data-pearl-caustics=""
        data-preset={preset}
        data-surface={surface}
        data-motion={effectiveMotion}
        data-paused={paused ? "true" : "false"}
        data-ready={ready ? "true" : "false"}
        data-render={
          failed ? "fallback" : softwareStill ? "software-still" : "webgl"
        }
        data-loop={resolvedLoopSeconds}
        data-speed={tuning.speed}
        data-start-phase={clamp(startPhase, 0, 1)}
        data-interactive={interactive ? "true" : "false"}
        data-monochrome={monochrome ? "true" : "false"}
      >
        <div className={styles.fallback} aria-hidden="true" />
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      </div>
    );
  },
);

PearlCaustics.displayName = "PearlCaustics";

export default PearlCaustics;
