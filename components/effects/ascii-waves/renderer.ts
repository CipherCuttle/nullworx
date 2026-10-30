import { createGlyphAtlas, type GlyphAtlas } from "./glyphAtlas";

export interface WavesSettings {
  characters: string;
  color: string;
  invert: boolean;
  cellSize: number;
  noiseScale: number;
  speed: number;
  waveTension: number;
  waveTwist: number;
  intensity: number;
  cursorInteraction: boolean;
  interactionIntensity: number;
}

export interface RendererMetrics {
  fps: number;
  frameMs: number;
  drawCalls: 1;
  width: number;
  height: number;
  dpr: number;
  maxDpr: number;
  columns: number;
  rows: number;
  cellPx: number;
  videoEnabled: boolean;
  videoTime: number;
  videoPaused: boolean;
  videoUploads: number;
  webglRenderer: string;
  running: boolean;
}

export interface RendererSnapshot {
  width: number;
  height: number;
  dpr: number;
  maxDpr: number;
  cellSize: number;
  waveClock: number;
  frameCount: number;
  pointer: { x: number; y: number; strength: number };
  settings: WavesSettings;
}

export interface RendererOptions {
  /** 2 = high, 1.5 = balanced, 1 = efficient. Clamped to the browser DPR. */
  maxDpr?: number;
}

export const DEFAULT_SETTINGS: WavesSettings = {
  characters: ` .:-+*=%@#`,
  color: "#ffffff",
  invert: false,
  cellSize: 16,
  noiseScale: 2,
  speed: 1,
  waveTension: 0.5,
  waveTwist: 0.1,
  intensity: 1,
  cursorInteraction: true,
  interactionIntensity: 1,
};

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

/**
 * The fragment shader is copied from the owner-approved Proof 03 build. Do not
 * change this program to make the React extraction easier to demonstrate:
 * Flower fidelity depends on the same UV warp, luma mapping and atlas sampling.
 */
const FRAG = `#version 300 es
precision highp float;
precision highp int;

uniform vec2 uResolution;
uniform float uCellPx;
uniform float uTime;
uniform float uVideoEnabled;
uniform sampler2D uVideo;
uniform sampler2D uAtlas;
uniform float uAtlasCols;
uniform float uAtlasInner;
uniform float uAtlasPad;
uniform int uCharCount;
uniform vec3 uInk;
uniform float uInvert;
uniform float uNoiseScale;
uniform float uWaveTension;
uniform float uWaveTwist;
uniform float uIntensity;
uniform vec2 uPointer;
uniform float uPointerStrength;
uniform float uInteractionIntensity;

out vec4 fragColor;

float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y) * 2.0 - 1.0;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  mat2 rotate = mat2(0.80, 0.60, -0.60, 0.80);
  for (int i = 0; i < 4; i++) {
    value += amp * valueNoise(p);
    p = rotate * p * 2.03 + vec2(11.7, 7.1);
    amp *= 0.5;
  }
  return value;
}

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

float luma601(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec2 warpField(vec2 uv, float aspect) {
  vec2 p = uv - 0.5;
  p.x *= aspect;
  p.y *= 1.04;

  float t = uTime;
  float radius = length(p);

  float twistAngle = uWaveTwist * (0.85 + 0.40 * sin(t * 0.64 + p.y * 2.1));
  vec2 q = rotate2d(twistAngle) * (p * (0.85 + uNoiseScale * 0.72));
  q.x += uWaveTwist * p.y * 0.78;

  vec2 drift = vec2(t * 0.30, -t * 0.205);
  vec2 w1 = vec2(
    fbm(q + drift + vec2(0.4, 2.1)),
    fbm(q + drift + vec2(7.2, 3.6))
  );
  vec2 w2 = vec2(
    fbm(q * 1.85 + w1 * 1.30 + vec2(-t * 0.255, t * 0.155) + 3.4),
    fbm(q * 1.85 + w1 * 1.30 + vec2(5.7, 1.8) + vec2(t * 0.23, -t * 0.175))
  );

  float ring = sin(radius * (7.6 + uWaveTension * 3.0) - t * 2.05 + w1.x * 2.7);
  float swirl = uWaveTwist * 1.25 * smoothstep(1.15, 0.08, radius);
  vec2 tangent = vec2(-p.y, p.x) / (radius + 0.055);
  vec2 displacement = (w1 * 0.78 + w2 * 0.38);
  displacement += tangent * ring * swirl * 0.23;
  displacement += normalize(p + vec2(0.0001)) * ring * 0.0035 * uWaveTension;

  vec2 pointerP = (uPointer - 0.5) * vec2(aspect, 1.0);
  vec2 delta = p - pointerP;
  float pointerRadius = length(delta);
  float pointer = smoothstep(0.52, 0.015, pointerRadius) * uPointerStrength * uInteractionIntensity;
  vec2 pointerTangent = vec2(-delta.y, delta.x) / (pointerRadius + 0.035);
  displacement += pointerTangent * pointer * 0.42;
  displacement += normalize(delta + vec2(0.0001)) * pointer * sin(pointerRadius * 24.0 - t * 5.4) * 0.055;

  float amount = 0.165 * uIntensity * (0.20 + uWaveTension * 0.58);
  displacement *= amount;
  return uv + vec2(displacement.x / aspect, displacement.y);
}

vec4 proceduralField(vec2 uv, float aspect) {
  vec2 p = uv - 0.5;
  p.x *= aspect;
  p.y *= 1.06;
  float t = uTime;

  float angle = uWaveTwist * (0.72 + 0.28 * sin(t * 0.23 + p.y * 1.7));
  vec2 q = rotate2d(angle) * (p * (0.62 + uNoiseScale * 0.42));
  q.x += uWaveTwist * p.y * 0.62;

  vec2 drift = vec2(t * 0.155, -t * 0.112);
  vec2 w = vec2(
    fbm(q + drift + vec2(1.3, 4.1)),
    fbm(q + drift + vec2(8.4, 0.7))
  );
  float broad = fbm(q * 1.08 + w * 1.52 + drift * 0.62 + 3.8);
  float striation = sin((p.x * 1.15 + p.y * 0.82) * (1.4 + uNoiseScale * 0.55)
    - t * 1.05 + broad * 2.6 + w.x * 1.4 + uWaveTension * 0.7);

  // Two soft curtains of noise create a large-scale void without a mask or a
  // subject cutout. The field stays full-bleed: only the glyph ink changes.
  float curtainA = fbm(q * 0.82 + w * 0.74 - drift * 0.28 + 12.7);
  float curtainB = fbm(q * 0.56 - w * 0.55 + vec2(t * 0.07, -t * 0.045) + 4.2);
  float opening = smoothstep(-0.48, 0.16, curtainA + broad * 0.42 + 0.20);
  opening *= smoothstep(-0.54, 0.19, curtainB + w.y * 0.38 + 0.23);

  float field = 0.43 + broad * 0.58 + striation * (0.12 + uWaveTension * 0.11) + w.y * 0.055;
  field = smoothstep(0.16, 0.72, field);
  field = pow(field, 1.20);
  field *= opening;

  vec2 pointerP = (uPointer - 0.5) * vec2(aspect, 1.0);
  float pointerDist = length(p - pointerP);
  float pointer = smoothstep(0.48, 0.02, pointerDist) * uPointerStrength * uInteractionIntensity;
  field += pointer * 0.075 * (0.55 + 0.45 * sin(pointerDist * 22.0 - t * 3.5));

  field *= clamp(0.30 + uIntensity * 0.71, 0.0, 1.3);
  return vec4(uInk, clamp(field, 0.0, 0.997));
}

void main() {
  vec2 screenPx = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 cell = floor(screenPx / uCellPx);
  vec2 cellCenter = (cell + 0.5) * uCellPx;
  vec2 uv = cellCenter / uResolution;
  vec2 local = fract(screenPx / uCellPx);
  float aspect = uResolution.x / uResolution.y;

  vec3 sourceColor;
  float luma;
  if (uVideoEnabled > 0.5) {
    vec2 sampleUv = clamp(warpField(uv, aspect), vec2(0.0015), vec2(0.9985));
    sourceColor = texture(uVideo, sampleUv).rgb;
    luma = luma601(sourceColor);
    sourceColor *= uInk;
  } else {
    vec4 field = proceduralField(uv, aspect);
    sourceColor = field.rgb;
    luma = field.a;
  }

  if (uInvert > 0.5) luma = 1.0 - luma;

  int count = max(uCharCount, 1);
  int glyphIndex = int(clamp(floor(luma * float(count)), 0.0, float(count - 1)));
  vec2 slot = vec2(local.x * uAtlasInner + uAtlasPad, local.y * uAtlasInner + uAtlasPad);
  vec2 atlasUv = vec2((float(glyphIndex) + slot.x) / uAtlasCols, slot.y);
  float coverage = texture(uAtlas, atlasUv).a;

  fragColor = vec4(sourceColor * coverage, 1.0);
}`;

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not allocate a WebGL shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "Unknown shader error";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function buildProgram(gl: WebGL2RenderingContext): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, VERT);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
  const program = gl.createProgram();
  if (!program) throw new Error("Could not allocate a WebGL program.");
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "Unknown link error";
    gl.deleteProgram(program);
    throw new Error(log);
  }
  return program;
}

function parseColor(hex: string): [number, number, number] {
  const value = hex.trim().replace(/^#/, "");
  const normalized = value.length === 3
    ? value.split("").map((ch) => ch + ch).join("")
    : value.padEnd(6, "0").slice(0, 6);
  const n = Number.parseInt(normalized, 16);
  if (!Number.isFinite(n)) return [1, 1, 1];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function deviceDpr(maxDpr: number): number {
  return Math.min(maxDpr, Math.max(1, window.devicePixelRatio || 1));
}

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

export class AsciiWavesRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly uniforms: Record<string, WebGLUniformLocation | null>;
  private readonly atlasUniform: WebGLUniformLocation | null;
  private readonly videoUniform: WebGLUniformLocation | null;
  private glyphAtlas: GlyphAtlas;
  private videoTexture: WebGLTexture;
  private atlasCharacters = "";
  private video: HTMLVideoElement | null = null;
  private settings: WavesSettings = { ...DEFAULT_SETTINGS };
  private width = 1;
  private height = 1;
  private dpr = 1;
  private maxDpr: number;
  private raf = 0;
  private running = false;
  private lastFrame = 0;
  private waveClock = 0;
  private frameCount = 0;
  private videoUploads = 0;
  private uploadedVideoTime = Number.NaN;
  private uploadedVideoSource = "";
  private videoFrameDirty = true;
  private videoFrameHandle: number | null = null;
  private pointerTarget = { x: 0.5, y: 0.5 };
  private pointer = { x: 0.5, y: 0.5 };
  private pointerStrengthTarget = 0;
  private pointerStrength = 0;
  private frozenTime: number | null = null;
  private lastTimestamps: number[] = [];
  private frameDurations: number[] = [];
  private disposed = false;
  private readonly handleRender = (now: number) => this.render(now);

  constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error("WebGL 2 is unavailable in this browser.");
    this.gl = gl;
    this.maxDpr = Math.min(2, Math.max(1, options.maxDpr ?? 2));
    this.dpr = deviceDpr(this.maxDpr);
    this.program = buildProgram(gl);
    const vao = gl.createVertexArray();
    if (!vao) throw new Error("Could not allocate a WebGL vertex array.");
    this.vao = vao;

    const names = [
      "uResolution", "uCellPx", "uTime", "uVideoEnabled", "uAtlasCols", "uAtlasInner",
      "uAtlasPad", "uCharCount", "uInk", "uInvert", "uNoiseScale", "uWaveTension",
      "uWaveTwist", "uIntensity", "uPointer", "uPointerStrength", "uInteractionIntensity",
      "uVideoAspect", "uVideoScale",
    ];
    this.uniforms = Object.fromEntries(names.map((name) => [name, gl.getUniformLocation(this.program, name)]));
    this.atlasUniform = gl.getUniformLocation(this.program, "uAtlas");
    this.videoUniform = gl.getUniformLocation(this.program, "uVideo");
    this.glyphAtlas = createGlyphAtlas(gl, DEFAULT_SETTINGS.characters, DEFAULT_SETTINGS.cellSize, this.dpr);
    this.atlasCharacters = DEFAULT_SETTINGS.characters;
    this.videoTexture = this.createVideoTexture();
    this.resize();
    this.lastFrame = performance.now();
    this.setRunning(true);
  }

  private createVideoTexture(): WebGLTexture {
    const gl = this.gl;
    const texture = gl.createTexture();
    if (!texture) throw new Error("Could not allocate the video texture.");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  }

  private ensureAtlas() {
    if (this.settings.characters === this.atlasCharacters
      && this.glyphAtlas.cellCssPx === this.settings.cellSize
      && Math.abs(this.glyphAtlas.dpr - this.dpr) < 0.01) return;
    const next = createGlyphAtlas(this.gl, this.settings.characters, this.settings.cellSize, this.dpr);
    this.gl.deleteTexture(this.glyphAtlas.texture);
    this.glyphAtlas = next;
    this.atlasCharacters = this.settings.characters;
  }

  setSettings(settings: WavesSettings) {
    this.settings = { ...settings };
    const dpr = deviceDpr(this.maxDpr);
    if (dpr !== this.dpr) this.resize();
  }

  setMaxDpr(maxDpr: number) {
    const next = Math.min(2, Math.max(1, maxDpr));
    if (next === this.maxDpr) return;
    this.maxDpr = next;
    this.resize();
  }

  setVideo(video: HTMLVideoElement | null, enabled: boolean) {
    const next = enabled ? video : null;
    if (this.video !== next) {
      this.cancelVideoFrameCallback();
      this.video = next;
      this.queueVideoFrameCallback();
    }
    this.videoFrameDirty = true;
    this.uploadedVideoTime = Number.NaN;
    this.uploadedVideoSource = "";
    this.resize();
  }

  private cancelVideoFrameCallback() {
    const video = this.video as VideoWithFrameCallback | null;
    if (video && this.videoFrameHandle !== null && typeof video.cancelVideoFrameCallback === "function") {
      video.cancelVideoFrameCallback(this.videoFrameHandle);
    }
    this.videoFrameHandle = null;
  }

  private queueVideoFrameCallback() {
    const video = this.video as VideoWithFrameCallback | null;
    if (!video || typeof video.requestVideoFrameCallback !== "function") return;
    this.videoFrameHandle = video.requestVideoFrameCallback(() => {
      this.videoFrameDirty = true;
      this.videoFrameHandle = null;
      this.queueVideoFrameCallback();
    });
  }

  markVideoDirty() {
    this.videoFrameDirty = true;
    this.uploadedVideoTime = Number.NaN;
    this.uploadedVideoSource = "";
  }

  setPointer(x: number, y: number, active = true) {
    this.pointerTarget.x = Math.min(1, Math.max(0, x));
    this.pointerTarget.y = Math.min(1, Math.max(0, y));
    this.pointerStrengthTarget = active && this.settings.cursorInteraction ? 1 : 0;
  }

  setPointerActive(active: boolean) {
    this.pointerStrengthTarget = active && this.settings.cursorInteraction ? 1 : 0;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, rect.width);
    const cssHeight = Math.max(1, rect.height);
    this.dpr = deviceDpr(this.maxDpr);
    const width = Math.max(1, Math.round(cssWidth * this.dpr));
    const height = Math.max(1, Math.round(cssHeight * this.dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.width = width;
    this.height = height;
  }

  setRunning(running: boolean) {
    if (this.disposed || this.running === running) return;
    this.running = running;
    if (running) {
      this.lastFrame = performance.now();
      this.raf = requestAnimationFrame(this.handleRender);
    } else {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private updatePointer(dt: number) {
    const strengthEase = 1 - Math.exp(-dt * 6.5);
    const positionEase = 1 - Math.exp(-dt * 11);
    const desiredStrength = this.settings.cursorInteraction ? this.pointerStrengthTarget : 0;
    this.pointerStrength += (desiredStrength - this.pointerStrength) * strengthEase;
    this.pointer.x += (this.pointerTarget.x - this.pointer.x) * positionEase;
    this.pointer.y += (this.pointerTarget.y - this.pointer.y) * positionEase;
  }

  private uploadVideo() {
    const video = this.video;
    if (!video || video.readyState < 2) return;
    const supportsFrameCallback = typeof (video as VideoWithFrameCallback).requestVideoFrameCallback === "function";
    if (supportsFrameCallback) {
      if (!this.videoFrameDirty) return;
    } else if (video.currentTime === this.uploadedVideoTime && video.currentSrc === this.uploadedVideoSource) {
      return;
    }
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      this.videoUploads += 1;
    } catch {
      return;
    }
    this.uploadedVideoTime = video.currentTime;
    this.uploadedVideoSource = video.currentSrc;
    this.videoFrameDirty = false;
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  private render(now: number) {
    if (this.disposed || !this.running) return;
    this.raf = requestAnimationFrame(this.handleRender);
    const rawDt = (now - this.lastFrame) / 1000;
    const dt = Math.min(0.08, Math.max(0, rawDt));
    this.lastFrame = now;
    if (this.frozenTime !== null) {
      this.waveClock = this.frozenTime;
    } else {
      this.waveClock += dt * this.settings.speed;
    }
    this.updatePointer(dt);
    this.ensureAtlas();
    this.uploadVideo();

    const gl = this.gl;
    const hasVideo = Boolean(this.video && this.video.readyState >= 2);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);

    const u = this.uniforms;
    const charCount = Array.from(this.settings.characters).length;
    gl.uniform2f(u.uResolution, this.width, this.height);
    gl.uniform1f(u.uCellPx, Math.max(2, this.settings.cellSize * this.dpr));
    gl.uniform1f(u.uTime, this.waveClock);
    gl.uniform1f(u.uVideoEnabled, hasVideo ? 1 : 0);
    gl.uniform1f(u.uAtlasCols, this.glyphAtlas.columns);
    gl.uniform1f(u.uAtlasInner, this.glyphAtlas.inner);
    gl.uniform1f(u.uAtlasPad, this.glyphAtlas.pad);
    gl.uniform1i(u.uCharCount, charCount);
    const ink = parseColor(this.settings.color);
    gl.uniform3f(u.uInk, ink[0], ink[1], ink[2]);
    gl.uniform1f(u.uInvert, this.settings.invert ? 1 : 0);
    gl.uniform1f(u.uNoiseScale, this.settings.noiseScale);
    gl.uniform1f(u.uWaveTension, this.settings.waveTension);
    gl.uniform1f(u.uWaveTwist, this.settings.waveTwist);
    gl.uniform1f(u.uIntensity, this.settings.intensity);
    gl.uniform2f(u.uPointer, this.pointer.x, this.pointer.y);
    gl.uniform1f(u.uPointerStrength, this.pointerStrength);
    gl.uniform1f(u.uInteractionIntensity, this.settings.interactionIntensity);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.glyphAtlas.texture);
    gl.uniform1i(this.atlasUniform, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
    gl.uniform1i(this.videoUniform, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);

    this.frameCount += 1;
    this.recordPerformance(now, rawDt);
  }

  private recordPerformance(now: number, rawDt: number) {
    this.lastTimestamps.push(now);
    if (this.lastTimestamps.length > 180) this.lastTimestamps.shift();
    if (rawDt > 0 && rawDt < 0.2) {
      this.frameDurations.push(rawDt * 1000);
      if (this.frameDurations.length > 180) this.frameDurations.shift();
    }
  }

  getMetrics(): RendererMetrics {
    const timestamps = this.lastTimestamps;
    const fps = timestamps.length > 2
      ? (timestamps.length - 1) * 1000 / Math.max(1, timestamps[timestamps.length - 1]! - timestamps[0]!)
      : 0;
    const frameMs = this.frameDurations.length
      ? this.frameDurations.reduce((sum, value) => sum + value, 0) / this.frameDurations.length
      : 0;
    const gl = this.gl;
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      fps: Number(fps.toFixed(1)),
      frameMs: Number(frameMs.toFixed(2)),
      drawCalls: 1,
      width: this.width,
      height: this.height,
      dpr: this.dpr,
      maxDpr: this.maxDpr,
      columns: Math.ceil(this.width / Math.max(2, this.settings.cellSize * this.dpr)),
      rows: Math.ceil(this.height / Math.max(2, this.settings.cellSize * this.dpr)),
      cellPx: this.settings.cellSize,
      videoEnabled: Boolean(this.video && this.video.readyState >= 2),
      videoTime: this.video?.currentTime ?? 0,
      videoPaused: this.video?.paused ?? true,
      videoUploads: this.videoUploads,
      webglRenderer: debug ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER)),
      running: this.running,
    };
  }

  snapshot(): RendererSnapshot {
    return {
      width: this.width,
      height: this.height,
      dpr: this.dpr,
      maxDpr: this.maxDpr,
      cellSize: this.settings.cellSize,
      waveClock: this.waveClock,
      frameCount: this.frameCount,
      pointer: { x: this.pointer.x, y: this.pointer.y, strength: this.pointerStrength },
      settings: { ...this.settings },
    };
  }

  setFrozenTime(value: number | null) {
    this.frozenTime = value;
  }

  getWaveClock(): number {
    return this.waveClock;
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.running = false;
    this.cancelVideoFrameCallback();
    const gl = this.gl;
    gl.deleteTexture(this.glyphAtlas.texture);
    gl.deleteTexture(this.videoTexture);
    gl.deleteVertexArray(this.vao);
    gl.deleteProgram(this.program);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  get canvasElement() {
    return this.canvas;
  }
}
