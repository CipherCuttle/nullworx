"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import styles from "./shader-canvas.module.css";

type Status = "loading" | "webgl2" | "fallback";
export type ShaderCanvasProps = {
  fragment: string;
  label: string;
  paused?: boolean;
  speed?: number;
  intensity?: number;
  className?: string;
};

const vertex = [
  "#version 300 es",
  "in vec2 aPosition;",
  "out vec2 vUv;",
  "void main(){ vUv = aPosition * .5 + .5; gl_Position = vec4(aPosition, 0., 1.); }",
].join("\n");

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader allocation failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || "unknown shader error";
    gl.deleteShader(shader);
    throw new Error(message);
  }
  return shader;
}

/** Small renderer shared only by the two flagship WebGL proofs. No global GL state. */
export function ShaderCanvas({
  fragment, label, paused = false, speed = 1, intensity = .7, className,
}: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef<[number, number]>([.5, .5]);
  const paramsRef = useRef({ paused, speed, intensity });
  const [status, setStatus] = useState<Status>("loading");
  const [retry, setRetry] = useState(0);
  paramsRef.current = { paused, speed, intensity };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let frame = 0;
    let count = 0;
    let elapsed = 0;
    let last = 0;
    let visible = true;
    let reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "low-power" });
    if (!gl) { setStatus("fallback"); return; }
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let vs: WebGLShader | null = null;
    let fs: WebGLShader | null = null;
    let ro: ResizeObserver | null = null;
    let io: IntersectionObserver | null = null;
    try {
      vs = compile(gl, gl.VERTEX_SHADER, vertex);
      fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
      program = gl.createProgram();
      if (!program) throw new Error("program allocation failed");
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "shader link failed");
      buffer = gl.createBuffer();
      if (!buffer) throw new Error("geometry allocation failed");
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
      gl.useProgram(program);
      const pos = gl.getAttribLocation(program, "aPosition");
      gl.enableVertexAttribArray(pos);
      gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
      const res = gl.getUniformLocation(program, "uResolution");
      const clock = gl.getUniformLocation(program, "uTime");
      const pointer = gl.getUniformLocation(program, "uPointer");
      const strength = gl.getUniformLocation(program, "uIntensity");
      const resize = () => {
        const r = canvas.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        const scale = Math.min(1, 1600 / Math.max(r.width * dpr, r.height * dpr, 1));
        canvas.width = Math.max(1, Math.round(r.width * dpr * scale));
        canvas.height = Math.max(1, Math.round(r.height * dpr * scale));
        gl.viewport(0, 0, canvas.width, canvas.height);
      };
      const draw = (now: number) => {
        if (disposed) return;
        const delta = last ? Math.min(0.05, (now - last) / 1000) : 0;
        last = now;
        const settings = paramsRef.current;
        if (visible && !document.hidden && !settings.paused && !reduced) elapsed += delta * Math.max(.1, Math.min(3, settings.speed));
        if (visible && !document.hidden) {
          gl.useProgram(program);
          gl.uniform2f(res, canvas.width, canvas.height);
          gl.uniform1f(clock, elapsed);
          gl.uniform2f(pointer, pointerRef.current[0], pointerRef.current[1]);
          gl.uniform1f(strength, Math.max(0, Math.min(1, settings.intensity)));
          gl.drawArrays(gl.TRIANGLES, 0, 6);
          count++;
          if (count % 60 === 0) canvas.dataset.frames = String(count);
        }
        frame = window.requestAnimationFrame(draw);
      };
      const onMotion = () => { reduced = media.matches; last = 0; };
      const onVisibility = () => { last = 0; };
      const onLost = (event: Event) => {
        event.preventDefault();
        if (!disposed) { window.cancelAnimationFrame(frame); setStatus("fallback"); }
      };
      const onRestored = () => { if (!disposed) setRetry((v) => v + 1); };
      canvas.addEventListener("webglcontextlost", onLost);
      canvas.addEventListener("webglcontextrestored", onRestored);
      media.addEventListener("change", onMotion);
      document.addEventListener("visibilitychange", onVisibility);
      ro = new ResizeObserver(resize);
      ro.observe(canvas);
      io = new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting ?? true; last = 0; }, { threshold: .01 });
      io.observe(canvas);
      resize();
      setStatus("webgl2");
      frame = window.requestAnimationFrame(draw);
      return () => {
        disposed = true;
        window.cancelAnimationFrame(frame);
        ro?.disconnect();
        io?.disconnect();
        media.removeEventListener("change", onMotion);
        document.removeEventListener("visibilitychange", onVisibility);
        canvas.removeEventListener("webglcontextlost", onLost);
        canvas.removeEventListener("webglcontextrestored", onRestored);
        if (!gl.isContextLost()) {
          if (buffer) gl.deleteBuffer(buffer);
          if (program) gl.deleteProgram(program);
          if (vs) gl.deleteShader(vs);
          if (fs) gl.deleteShader(fs);
        }
      };
    } catch (error) {
      console.warn("[forge-flagship-01] WebGL unavailable:", error);
      setStatus("fallback");
      if (buffer) gl.deleteBuffer(buffer);
      if (program) gl.deleteProgram(program);
      if (vs) gl.deleteShader(vs);
      if (fs) gl.deleteShader(fs);
      return;
    }
  }, [fragment, retry]);

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === "touch") return;
    const r = event.currentTarget.getBoundingClientRect();
    pointerRef.current = [
      Math.max(0, Math.min(1, (event.clientX - r.left) / Math.max(1, r.width))),
      Math.max(0, Math.min(1, 1 - (event.clientY - r.top) / Math.max(1, r.height))),
    ];
  }
  return (
    <div className={[styles.stage, className].filter(Boolean).join(" ")} data-shader-status={status} aria-label={label} role="img">
      <div className={styles.fallback} aria-hidden="true" />
      <canvas ref={canvasRef} className={status === "webgl2" ? styles.canvas : styles.hidden} onPointerMove={onPointerMove} onPointerLeave={() => { pointerRef.current = [.5, .5]; }} aria-hidden="true" />
      {status === "fallback" && <span className={styles.notice}>Static visual fallback · WebGL2 unavailable</span>}
    </div>
  );
}
