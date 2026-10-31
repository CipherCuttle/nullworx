"use client";

import Link from "next/link";
import { useState } from "react";
import { GlyphMorph } from "@/components/forge-factory-01/glyph-morph";
import { PrismText } from "@/components/forge-factory-01/prism-text";
import { MagneticFocus } from "@/components/forge-factory-01/magnetic-focus";
import styles from "./gallery.module.css";

type Effect = "glyph" | "prism" | "magnetic";
const effects: { id: Effect; name: string; kind: string; description: string; files: string[] }[] = [
  { id: "glyph", name: "Glyph Morph", kind: "Typography / algorithmic", description: "A deterministic character transformation that keeps the true phrase accessible while the visible glyphs settle.", files: ["glyph-morph.tsx", "glyph-morph.module.css", "use-reduced-motion.ts"] },
  { id: "prism", name: "Prism Text", kind: "Material / CSS", description: "Slow, spectral gradient color living inside real selectable type. No image textures or WebGL required.", files: ["prism-text.tsx", "prism-text.module.css"] },
  { id: "magnetic", name: "Magnetic Focus", kind: "Interaction / pointer", description: "Pointer-responsive displacement and radial light. Keyboard and touch behavior remain stable.", files: ["magnetic-focus.tsx", "magnetic-focus.module.css", "use-reduced-motion.ts"] },
];

const samples = {
  glyph: ["HELLO WORLD", "NEW SIGNAL", "RECONSTRUCT"],
  prism: ["Somewhere else.", "Prismatic.", "After the rain."],
  magnetic: ["ENTER THE FIELD", "LAUNCH PREVIEW", "EXPLORE EFFECT"],
} satisfies Record<Effect, string[]>;

export function ForgeFactoryGallery() {
  const [selected, setSelected] = useState<Effect>("glyph");
  const [preset, setPreset] = useState(0);
  const [intensity, setIntensity] = useState(0.68);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [seed, setSeed] = useState(17);
  const [clicks, setClicks] = useState(0);
  const current = effects.find((effect) => effect.id === selected)!;
  const sample = samples[selected][preset]!;
  function select(effect: Effect) {
    setSelected(effect);
    setPreset(0);
    setPaused(false);
    setSeed((n) => n + 1);
  }
  return (
    <main id="main" tabIndex={-1} className={styles.page} data-forge-factory="01">
      <div className={styles.wrap}>
        <nav className={styles.top} aria-label="Factory navigation">
          <Link href="/lab" className={styles.brand}>UI FORGE<span className={styles.brandDot}>.</span></Link>
          <span className={styles.topCenter}>AN EXPERIMENTAL FIELD GUIDE / 01</span>
          <span className={styles.topRight}>PROOF ONLY · NOT RELEASED</span>
        </nav>
        <header className={styles.hero}>
          <div>
            <div className={styles.kicker}><span className={styles.pulse} /> EFFECT FACTORY / FIRST STUDIES</div>
            <h1>Good effects.<br /><em>Real components.</em></h1>
            <p className={styles.intro}>Original, installable-in-principle React experiments. Three independent effects. One deliberately quiet, white review gallery. Nothing is for sale or release yet.</p>
          </div>
          <div className={styles.meta}>
            <span className={styles.metaNumber}>03<span> / 12</span></span>
            <span>FIRST PROOF BATCH</span>
            <span>DOM · CSS · MOTION</span>
            <span>NO NEW RUNTIME DEPENDENCIES</span>
          </div>
        </header>
        <div className={styles.workbench}>
          <div className={styles.sidebar}>
            <div className={styles.sectionTitle}><span>01</span> EFFECT SELECTOR</div>
            <div className={styles.tabs} role="tablist" aria-label="Choose an effect">
              {effects.map((effect, i) => (
                <button
                  key={effect.id} type="button" role="tab"
                  id={`forge-tab-${effect.id}`} aria-controls="forge-stage" aria-selected={selected === effect.id}
                  onClick={() => select(effect.id)}
                  className={selected === effect.id ? styles.tabActive : styles.tab}
                  data-testid={`select-${effect.id}`}
                >
                  <span className={styles.tabIndex}>0{i + 1}</span>
                  <span className={styles.tabName}>{effect.name}<small>{effect.kind}</small></span>
                  <span className={styles.tabArrow}>↗</span>
                </button>
              ))}
            </div>
            <div className={styles.settings}>
              <div className={styles.sectionTitle}><span>02</span> LIVE CONTROLS</div>
              <div className={styles.settingRow}>
                <label htmlFor="forge-preset">Text preset</label>
                <select id="forge-preset" value={preset} onChange={(e) => setPreset(Number(e.target.value))}>
                  {samples[selected].map((item, i) => <option value={i} key={item}>{String(i + 1).padStart(2, "0")} — {item}</option>)}
                </select>
              </div>
              <div className={styles.settingRow}>
                <label htmlFor="forge-speed">Speed <output htmlFor="forge-speed">{speed.toFixed(2)}×</output></label>
                <input type="range" id="forge-speed" min="0.25" max="2" step="0.05" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
              </div>
              <div className={styles.settingRow}>
                <label htmlFor="forge-intensity">Intensity <output htmlFor="forge-intensity">{Math.round(intensity * 100)}%</output></label>
                <input type="range" id="forge-intensity" min="0" max="1" step="0.05" value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} />
              </div>
              <div className={styles.actions}>
                <button type="button" onClick={() => setPaused((v) => !v)} data-testid="toggle-motion">{paused ? "RESUME" : "PAUSE"}</button>
                <button type="button" onClick={() => { setSeed((n) => n + 1); setPreset((n) => (n + 1) % samples[selected].length); }} data-testid="replay">REPLAY ↗</button>
              </div>
              <div className={styles.note}>Reduced-motion preference overrides visual movement. Controls affect this preview only.</div>
            </div>
          </div>
          <section className={styles.viewer} id="forge-stage" role="tabpanel" aria-labelledby={`forge-tab-${selected}`}>
            <div className={styles.viewerHead}>
              <span>LIVE STAGE / {current.name.toUpperCase()}</span>
              <span className={styles.live}><span /> PROOF / NOT RELEASED</span>
            </div>
            <div className={`${styles.stage} ${selected === "prism" ? styles.stagePrism : selected === "magnetic" ? styles.stageMagnetic : styles.stageGlyph}`} data-testid="effect-stage">
              <span className={styles.coordTop}>F/01 — {current.kind.toUpperCase()}</span>
              <div className={styles.effectWrap} data-testid="effect-content">
                {selected === "glyph" && <GlyphMorph text={sample} seed={seed} durationMs={Math.round(850 / speed)} paused={paused} />}
                {selected === "prism" && <PrismText text={sample} speed={speed} intensity={intensity} paused={paused} />}
                {selected === "magnetic" && (
                  <div className={styles.magneticGroup}>
                    <MagneticFocus label={sample} intensity={intensity} paused={paused} onClick={() => setClicks((n) => n + 1)} />
                    <div className={styles.counter} aria-live="polite">{clicks ? `Activated ${clicks} time${clicks === 1 ? "" : "s"}` : "Pointer / keyboard / touch"}</div>
                  </div>
                )}
              </div>
              <span className={styles.coordBottom}>TYPE / EXPERIMENT 001 <span>ORIGINAL SOURCE</span></span>
            </div>
            <div className={styles.viewerFoot}>
              <div><strong>{current.name}</strong><span>{current.description}</span></div>
              <span className={styles.review}>AWAITING ART REVIEW</span>
            </div>
          </section>
        </div>
        <section className={styles.under}>
          <div>
            <div className={styles.sectionTitle}><span>03</span> SOURCE CONTRACT</div>
            <h2>Built for other<br /><em>people&apos;s projects.</em></h2>
            <p>Each effect is independently importable, framework-neutral React code (no Next-specific import), with separately scoped styles. Packages are not published until a clean external-consumer test and explicit owner approval.</p>
          </div>
          <div className={styles.filelist}>
            <div className={styles.fileHead}><span>{current.name.toUpperCase()} / REQUIRED FILES</span><span>LOCAL PROOF</span></div>
            {current.files.map((file, i) => <div className={styles.fileRow} key={file}><span>{String(i + 1).padStart(2, "0")}</span><code>components/forge-factory-01/{file}</code><span>TS/CSS</span></div>)}
            <div className={styles.fileFoot}>No checkout, public release, packaged asset license or registry entry has been authorized.</div>
          </div>
        </section>
        <footer className={styles.footer}><span>UI FORGE / EFFECT FACTORY 01</span><span>WHITE ORIGINAL DIRECTION · PRESERVE WIP</span><Link href="/lab">BACK TO NULLWORX LAB ↗</Link></footer>
      </div>
    </main>
  );
}
