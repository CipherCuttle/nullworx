"use client";
import { useState } from "react";
import { SpectralField, spectralPresets } from "@/components/forge-flagship-01/spectral-field";
import { LiquidRefraction, liquidPresets } from "@/components/forge-flagship-01/liquid-refraction";
import { RefractionCard } from "@/components/forge-flagship-01/refraction-card";
import styles from "./gallery.module.css";

type Effect = "spectral" | "liquid" | "card";
const names: { id: Effect; label: string; detail: string }[] = [
 { id: "spectral", label: "Spectral Field", detail: "Atmospheric / WebGL2" },
 { id: "liquid", label: "Liquid Refraction", detail: "Optical lens / WebGL2" },
 { id: "card", label: "Refraction Cards", detail: "Interactive material / CSS" },
];
const fileMap: Record<Effect,string[]> = {
 spectral: ["spectral-field.tsx", "spectral-field.module.css", "shader-canvas.tsx", "shader-canvas.module.css"],
 liquid: ["liquid-refraction.tsx", "liquid-refraction.module.css", "shader-canvas.tsx", "shader-canvas.module.css"],
 card: ["refraction-card.tsx", "refraction-card.module.css"],
};
export function FlagshipGallery() {
 const [selected,setSelected]=useState<Effect>("spectral");
 const [preset,setPreset]=useState<"signature"|"soft"|"electric">("signature");
 const [paused,setPaused]=useState(false);
 const [intensity,setIntensity]=useState(.76);
 const [speed,setSpeed]=useState(.7);
 function choose(effect:Effect){setSelected(effect);setPaused(false);setPreset("signature");setIntensity(.76);setSpeed(.7);}
 function changePreset(preset:"signature"|"soft"|"electric") {
   setPreset(preset);
   const choice=selected === "liquid" ? (preset === "soft" ? liquidPresets.calm : preset === "electric" ? liquidPresets.turbulent : liquidPresets.lens)
    : (preset === "soft" ? spectralPresets.soft : preset === "electric" ? spectralPresets.electric : spectralPresets.aurora);
   setIntensity(choice.intensity);setSpeed(choice.speed);
 }
 const current=names.find((e)=>e.id===selected)!;
 return <main id="main" tabIndex={-1} className={styles.page} data-forge-flagship="01">
  <div className={styles.wrap}>
   <header className={styles.top}><a href="/lab/forge-factory-01">UI FORGE<span>.</span></a><small>FLAGSHIP STUDIES / 02</small><small>PROOF ONLY · NOINDEX</small></header>
   <div className={styles.hero}><div><span className={styles.kicker}>BATCH B / OPTICAL SYSTEMS</span><h1>Light behaves <em>differently.</em></h1><p>Three original material experiments. Tunable, responsive, and intentionally unreleased. Judge the motion, not only the still frame.</p></div><strong>06<span>/12</span></strong></div>
   <div className={styles.workbench}>
    <aside className={styles.side}>
     <span className={styles.label}>01 / SELECT STUDY</span>
     {names.map((effect,i)=><button type="button" key={effect.id} className={selected===effect.id?styles.active:styles.tab} data-testid={"select-"+effect.id} aria-pressed={selected===effect.id} onClick={()=>choose(effect.id)}><small>0{i+4}</small><span>{effect.label}<em>{effect.detail}</em></span><b>↗</b></button>)}
     <div className={styles.controls}><span className={styles.label}>02 / MATERIAL CONTROLS</span>
      <label>Preset<select value={preset} onChange={(e)=>changePreset(e.target.value as "signature"|"soft"|"electric")}><option value="signature">Signature</option><option value="soft">Soft / restrained</option><option value="electric">Electric / intense</option></select></label>
      <label>Intensity <output>{Math.round(intensity*100)}%</output><input type="range" min="0" max="1" step=".05" value={intensity} onChange={e=>setIntensity(Number(e.target.value))}/></label>
      <label>Speed <output>{speed.toFixed(2)}×</output><input type="range" min=".1" max="2" step=".05" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/></label>
      <button className={styles.pause} type="button" data-testid="toggle-motion" onClick={()=>setPaused(v=>!v)}>{paused?"RESUME":"PAUSE"} MOTION</button>
      <p>Touch remains stable. System reduced-motion preference is respected. WebGL2 unsupported → static fallback.</p>
     </div>
    </aside>
    <section className={styles.viewer} aria-label={current.label}><div className={styles.viewerTop}><span>LIVE MATERIAL / {current.label.toUpperCase()}</span><span>EXPERIMENTAL</span></div>
     <div className={selected==="card"?styles.cardStage:styles.stage} data-testid="flagship-stage">
      {selected==="spectral"&&<SpectralField intensity={intensity} speed={speed} paused={paused} />}
      {selected==="liquid"&&<LiquidRefraction intensity={intensity} speed={speed} paused={paused} />}
      {selected==="card"&&<><span className={styles.orb} aria-hidden="true"/><RefractionCard title="Glass, in motion." description="Frosted material, specular light and real semantic content. This proof does not yet physically distort the DOM backdrop." intensity={intensity} paused={paused}/></>}
     </div>
     <div className={styles.viewerFoot}><strong>{current.label}</strong><span>AWAITING OWNER VISUAL REVIEW</span></div>
    </section>
   </div>
   <section className={styles.foot}><div><span className={styles.label}>03 / SOURCE CONTRACT</span><h2>Visual first. <em>Portable next.</em></h2><p>Standalone React + TypeScript effects. No Next imports in components. Source, browser receipts, animation and commercial portability still need verification.</p></div><div><span className={styles.label}>FILES / {current.label.toUpperCase()}</span>{fileMap[selected].map(file=><code key={file}>components/forge-flagship-01/{file}</code>)}</div></section>
  </div></main>;
}
