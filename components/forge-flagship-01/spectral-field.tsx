"use client";
import { ShaderCanvas, type ShaderCanvasProps } from "./shader-canvas";
import styles from "./spectral-field.module.css";
export type SpectralFieldProps = Omit<ShaderCanvasProps, "fragment" | "label">;
export const spectralPresets = {
  aurora: { intensity: .76, speed: .7 },
  soft: { intensity: .43, speed: .35 },
  electric: { intensity: 1, speed: 1.5 },
} as const;

const fragment = [
"#version 300 es",
"precision highp float;",
"in vec2 vUv; out vec4 fragColor;",
"uniform vec2 uResolution, uPointer;",
"uniform float uTime, uIntensity;",
"float hash(vec2 p) {return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453);}",
"float noise(vec2 p) {vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}",
"void main(){",
" vec2 p=(vUv-.5)*vec2(uResolution.x/max(1.,uResolution.y),1.);",
" vec3 color=vec3(.009,.015,.047);",
" float n=noise(p*3.3+uTime*.08);",
" float fold=sin(p.x*3.1+sin(p.y*4.1+uTime*.28)+n*2.4)*.16;",
" float g=0.;",
" for(int i=0;i<5;i++){",
"   float k=float(i);",
"   float y=-.42+k*.19+fold*sin(1.7+k*.72)+sin(p.x*(2.1+k*.2)-uTime*(.13+k*.02)+k*1.7)*(.07+.03*n);",
"   y+= (uPointer.y-.5)*.12*uIntensity;",
"   float d=abs(p.y-y);",
"   float band=exp(-d*d/(.0016+k*.0004));",
"   float glow=exp(-d*(10.+k));",
"   vec3 tint=mix(vec3(.03,.75,.71),vec3(.84,.27,.68),k/4.);",
"   tint=mix(tint, vec3(.99,.72,.49),smoothstep(.35,.65,p.x+n*.12));",
"   color+=tint*(band*.25+glow*.055)*(.42+uIntensity*.95);",
"   g+=glow;",
" }",
" float halo=exp(-length(p-vec2(.27,.11)) * 3.8)*.1;",
" color+=vec3(.17,.32,.65)*halo+vec3(.02,.045,.12)*g*.07;",
" float grain=(hash(gl_FragCoord.xy+floor(uTime*3.))-.5)*.014;",
" color=pow(max(color+grain,0.),vec3(.88));",
" fragColor=vec4(color,1.);",
"}",
].join("\n");

export function SpectralField(props: SpectralFieldProps) {
  return <ShaderCanvas {...props} fragment={fragment} label="Animated spectral atmospheric field" className={[styles.field, props.className].filter(Boolean).join(" ")} />;
}
