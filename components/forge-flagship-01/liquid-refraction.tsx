"use client";
import { ShaderCanvas, type ShaderCanvasProps } from "./shader-canvas";
import styles from "./liquid-refraction.module.css";
export type LiquidRefractionProps = Omit<ShaderCanvasProps, "fragment" | "label">;
export const liquidPresets = {
  lens: { intensity: .85, speed: .7 },
  calm: { intensity: .35, speed: .3 },
  turbulent: { intensity: 1, speed: 1.35 },
} as const;
const fragment=[
"#version 300 es",
"precision highp float;",
"in vec2 vUv; out vec4 fragColor;",
"uniform vec2 uResolution,uPointer;",
"uniform float uTime,uIntensity;",
"float line(float x,float t){return 1.-smoothstep(0.,t,abs(x));}",
"vec3 plate(vec2 p){",
" vec2 cell=abs(fract(p*9.)-.5);",
" float grid=pow(1.-smoothstep(.468,.5,max(cell.x,cell.y)),2.);",
" float stripe=.5+.5*sin(9.*p.x+7.*p.y);",
" return mix(vec3(.10,.20,.20),vec3(.17,.38,.35),stripe*.38)+vec3(.42,.57,.44)*grid*.22;",
"}",
"void main(){",
" vec2 ratio=vec2(uResolution.x/max(1.,uResolution.y),1.);",
" vec2 p=(vUv-.5)*ratio;",
" vec2 c=(uPointer-.5)*ratio*.55;",
" c+=vec2(.07*sin(uTime*.38),.05*cos(uTime*.28));",
" vec2 d=p-c;",
" float a=atan(d.y,d.x);",
" float r=length(d);",
" float edge=.29+.029*sin(5.*a+uTime*.56)+.014*cos(9.*a-uTime*.61);",
" float dist=r-edge;",
" float smoothLens=1.-smoothstep(-.035,.085,dist);",
" vec2 normal=normalize(d+vec2(.0001));",
" vec2 warp=-normal*(.10+.045*sin(a*3.+uTime*.56))*smoothLens*uIntensity;",
" warp+=vec2(sin(p.y*24.+uTime),cos(p.x*21.-uTime))*.003*smoothLens;",
" vec3 col=plate(vUv+warp/ratio);",
" col=mix(col,vec3(.72,.94,.83),(.23-.14*smoothstep(-.1,.07,dist))*smoothLens);",
" float rim=exp(-pow(dist/.012,2.));",
" float caustic=pow(max(0.,sin(a*12.-uTime*1.1+sin(a*4.))),12.)*smoothLens;",
" col+=vec3(.69,1.,.94)*(rim*.68+caustic*.25)*uIntensity;",
" col+=vec3(.08,.15,.13)*(1.-smoothstep(.4,1.0,r));",
" fragColor=vec4(col,1.);",
"}",
].join("\n");
export function LiquidRefraction(props: LiquidRefractionProps) {
  return <ShaderCanvas {...props} fragment={fragment} label="Interactive liquid lens distorting a procedural optical plate" className={[styles.field, props.className].filter(Boolean).join(" ")} />;
}
