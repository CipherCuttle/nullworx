"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  DEFAULT_LIVING_TYPE_RECIPE,
  LIVING_TYPE_PRESETS,
  LIVING_TYPE_TEXT_PATTERN,
  LivingType,
  parseLivingTypeRecipe,
  stringifyLivingTypeRecipe,
  updateLivingTypeRecipe,
  type LivingTypeColors,
  type LivingTypeMaterial,
  type LivingTypePresetId,
  type LivingTypeRecipe,
  type LivingTypeRendererState,
  type RecipeIssue,
} from "@/registry/nullworx/living-type-01/living-type";
import styles from "./living-type-demo.module.css";

const WEIGHTS = [200, 300, 400, 500, 600, 700, 800, 900] as const;

const RENDERER_LABELS: Record<LivingTypeRendererState, string> = {
  loading: "TYPESETTING",
  shader: "LIVE SHADER",
  "static-fallback": "STATIC FALLBACK",
  "context-lost": "CONTEXT LOST",
  "mask-error": "MASK ERROR",
  "mask-unsupported": "MASK UNSUPPORTED",
  "shader-error": "RENDERER ERROR",
};

type Notice =
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string; issues?: RecipeIssue[] };

function autoTitle(recipe: LivingTypeRecipe): string {
  const preset = LIVING_TYPE_PRESETS.find((entry) => entry.id === recipe.config.preset);
  return `${recipe.config.text} / ${preset?.name ?? recipe.config.preset}`;
}

function presetName(id: LivingTypePresetId): string {
  return LIVING_TYPE_PRESETS.find((entry) => entry.id === id)?.name ?? id;
}

function sliderValue(value: number, digits = 2): string {
  return value.toFixed(digits);
}

export function LivingTypeDemo() {
  const [recipe, setRecipe] = useState<LivingTypeRecipe>(DEFAULT_LIVING_TYPE_RECIPE);
  const [textDraft, setTextDraft] = useState(DEFAULT_LIVING_TYPE_RECIPE.config.text);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [renderer, setRenderer] = useState<LivingTypeRendererState>("loading");
  const [importText, setImportText] = useState("");
  const [previewWidth, setPreviewWidth] = useState(100);
  const [origin, setOrigin] = useState("http://127.0.0.1:3102");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const onRendererStateChange = useCallback((state: LivingTypeRendererState) => {
    setRenderer(state);
  }, []);

  const recipeJson = useMemo(() => stringifyLivingTypeRecipe(recipe), [recipe]);
  const installCommand = `npx shadcn@4.23.0 add ${origin}/r/living-type-01.json`;

  function patch(options: Parameters<typeof updateLivingTypeRecipe>[1]) {
    setRecipe((current) => updateLivingTypeRecipe(current, options));
  }

  function patchMaterial(options: Partial<LivingTypeMaterial>) {
    setRecipe((current) => updateLivingTypeRecipe(current, { material: options }));
  }

  function applyPreset(id: LivingTypePresetId) {
    setRecipe((current) => {
      const title = current.title === autoTitle(current) ? `${current.config.text} / ${presetName(id)}` : current.title;
      return updateLivingTypeRecipe(current, { preset: id, title });
    });
    setNotice(null);
  }

  function validateDraft(value: string): string | null {
    if (value.length === 0) return "A wordmark needs at least one character.";
    if (value.length > 24) return "This build supports up to 24 characters.";
    if (value.trim() !== value) return "Leading or trailing spaces are not allowed.";
    if (!LIVING_TYPE_TEXT_PATTERN.test(value)) {
      return "Supported characters: A–Z, a–z, 0–9, space, . & ' ! ? + - /";
    }
    return null;
  }

  function changeText(value: string) {
    setTextDraft(value);
    const error = validateDraft(value);
    if (error) {
      setNotice({ kind: "error", message: `${error} The preview holds the last valid wordmark.` });
      return;
    }
    setNotice(null);
    setRecipe((current) => {
      const title = current.title === autoTitle(current) ? `${value} / ${presetName(current.config.preset)}` : current.title;
      return updateLivingTypeRecipe(current, { text: value, title });
    });
  }

  function changeColor(index: number, value: string) {
    const colors = [...recipe.config.colors] as LivingTypeColors;
    colors[index] = value;
    patch({ colors });
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setNotice({ kind: "ok", message: `${label} copied.` });
    } catch {
      setNotice({ kind: "error", message: `Clipboard access was refused. Select the ${label.toLowerCase()} and copy it manually.` });
    }
  }

  function downloadRecipe() {
    const blob = new Blob([recipeJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${recipe.id}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice({ kind: "ok", message: `${recipe.id}.json downloaded.` });
  }

  function loadRecipe() {
    const parsed = parseLivingTypeRecipe(importText);
    if (!parsed.ok) {
      setNotice({
        kind: "error",
        message: "The recipe was rejected. Nothing was mounted.",
        issues: parsed.issues,
      });
      return;
    }
    setRecipe(parsed.recipe);
    setTextDraft(parsed.recipe.config.text);
    setNotice({ kind: "ok", message: `Loaded ${parsed.recipe.id}@${parsed.recipe.version}.` });
  }

  function reset() {
    setRecipe(DEFAULT_LIVING_TYPE_RECIPE);
    setTextDraft(DEFAULT_LIVING_TYPE_RECIPE.config.text);
    setImportText("");
    setPreviewWidth(100);
    setNotice({ kind: "ok", message: "Reset to NULLWORX / Night Bloom." });
  }

  const paused = recipe.config.playback.paused;
  const textError = validateDraft(textDraft);
  const activePreset = LIVING_TYPE_PRESETS.find((preset) => preset.id === recipe.config.preset) ?? LIVING_TYPE_PRESETS[0];

  return (
    <div className={styles.page}>
      <a className={styles.skip} href="#workbench">
        Skip to the Living Type workbench
      </a>

      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            N
          </span>
          <span className={styles.brandType}>
            <strong>NULLWORX</strong>
            <small>PROCEDURAL TYPOGRAPHY</small>
          </span>
        </div>
        <div className={styles.headerMeta}>
          <span className={styles.statusChip}>EXPERIMENTAL</span>
          <span className={styles.statusChip}>OWNER_REVIEW</span>
          <span className={styles.g5}>G5-A / 01</span>
        </div>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="living-type-title">
          <p className={styles.eyebrow}>NULLWORX / LIVING TYPE 01</p>
          <div className={styles.heroGrid}>
            <h1 id="living-type-title">
              Type that carries
              <br />
              <span>its own weather.</span>
            </h1>
            <div className={styles.heroCopy}>
              <p>
                A wordmark cut from live Paper Shaders material. The type is the mask; the colour never
                leaves the letterforms. Three art directions, one validated recipe, no Nullworx site
                required.
              </p>
              <p className={styles.heroNote}>
                Installable React source · self-hosted Unbounded type · Apache-2.0 upstream · OFL font
              </p>
            </div>
          </div>
        </section>

        <section className={styles.workbench} id="workbench" aria-label="Living Type workbench">
          <div className={styles.presetRow} role="group" aria-label="Art direction presets">
            {LIVING_TYPE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={styles.preset}
                data-active={preset.id === recipe.config.preset ? "true" : "false"}
                data-testid={`preset-${preset.id}`}
                aria-pressed={preset.id === recipe.config.preset}
                onClick={() => applyPreset(preset.id)}
              >
                <span className={styles.presetTop}>
                  <strong>{preset.name}</strong>
                  <span className={styles.presetId}>{preset.id}</span>
                </span>
                <span className={styles.swatches} aria-hidden="true">
                  {preset.config.colors.map((color) => (
                    <span key={color} style={{ background: color }} />
                  ))}
                </span>
                <span className={styles.presetDescription}>{preset.description}</span>
              </button>
            ))}
          </div>

          <div className={styles.workspace}>
            <div className={styles.stageColumn}>
              <div className={styles.stageHeader}>
                <span>
                  LIVE COMPOSITION <span aria-hidden="true">/</span> {activePreset.name}
                </span>
                <span className={styles.rendererState} data-testid="renderer-state" data-state={renderer}>
                  <i aria-hidden="true" />
                  {RENDERER_LABELS[renderer]}
                </span>
              </div>

              <div
                className={styles.stageWidth}
                style={{ "--preview-width": `${previewWidth}%` } as CSSProperties}
              >
                <LivingType
                  recipe={recipe}
                  className={styles.stage}
                  onRendererStateChange={onRendererStateChange}
                />
              </div>

              <div className={styles.stageFooter}>
                <span>
                  <code>
                    {recipe.id}@{recipe.version}
                  </code>
                </span>
                <span>{recipe.config.font.family} · {recipe.config.font.weight}</span>
                <span>{recipe.config.layout.aspect.toFixed(2)}:1</span>
                <span>{paused ? "PAUSED" : "RUNNING"}</span>
              </div>

              <div className={styles.stageControls}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  data-testid="pause-toggle"
                  onClick={() => patch({ paused: !paused })}
                >
                  {paused ? "Resume animation" : "Pause on this frame"}
                </button>
                <label className={styles.inlineField}>
                  <span>Reduced motion</span>
                  <select
                    data-testid="reduced-motion"
                    value={recipe.config.playback.reducedMotion}
                    onChange={(event) =>
                      patch({
                        reducedMotion: event.target.value === "force" ? "force" : "auto",
                      })
                    }
                  >
                    <option value="auto">Respect OS preference</option>
                    <option value="force">Force static</option>
                  </select>
                </label>
                <label className={styles.inlineField}>
                  <span>Preview width</span>
                  <input
                    type="range"
                    min={60}
                    max={100}
                    step={1}
                    value={previewWidth}
                    data-testid="preview-width"
                    onChange={(event) => setPreviewWidth(Number(event.target.value))}
                  />
                  <output>{previewWidth}%</output>
                </label>
              </div>

              <div className={styles.stageNotes}>
                <div className={styles.notesTop}>
                  <span>COMPOSITION NOTES</span>
                  <span>ONE SEAM / THREE DIRECTIONS</span>
                </div>
                <div className={styles.notesGrid}>
                  <div>
                    <strong>MASK</strong>
                    <p>Canvas 2D. Keyed by text, font version, weight, fit, tracking, frame ratio and rendered pixels.</p>
                  </div>
                  <div>
                    <strong>MATERIAL</strong>
                    <p>Paper Shaders MeshGradient 0.0.82. Mounted once; text edits change the mask, not the WebGL mount.</p>
                  </div>
                  <div>
                    <strong>TYPE</strong>
                    <p>Unbounded Variable 5.3.0, self-hosted and pinned. The readable wordmark is real DOM text.</p>
                  </div>
                </div>
                <p className={styles.pullQuote}>
                  The shader is the ink.
                  <br />
                  The type is the page.
                </p>
              </div>
            </div>

            <aside className={styles.controls} aria-label="Composition controls">
              <div className={styles.controlsHead}>
                <span>CONTROLS</span>
                <button type="button" className={styles.textButton} onClick={reset} data-testid="reset">
                  Reset
                </button>
              </div>

              <fieldset className={styles.fieldGroup}>
                <legend>Wordmark</legend>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Text <em>{textDraft.length}/24</em>
                  </span>
                  <input
                    type="text"
                    value={textDraft}
                    maxLength={30}
                    spellCheck={false}
                    autoComplete="off"
                    data-testid="text-input"
                    aria-invalid={Boolean(textError)}
                    aria-describedby="wordmark-help"
                    onChange={(event) => changeText(event.target.value)}
                  />
                </label>
                <p id="wordmark-help" className={styles.hint} data-error={textError ? "true" : "false"}>
                  {textError ?? "Latin wordmarks only. Unsupported characters are rejected, never silently replaced."}
                </p>
              </fieldset>

              <fieldset className={styles.fieldGroup}>
                <legend>Type</legend>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Weight</span>
                  <select
                    value={recipe.config.font.weight}
                    data-testid="weight"
                    onChange={(event) => patch({ weight: Number(event.target.value) })}
                  >
                    {WEIGHTS.map((weight) => (
                      <option key={weight} value={weight}>
                        {weight}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Frame aspect <output>{recipe.config.layout.aspect.toFixed(2)}:1</output>
                  </span>
                  <input
                    type="range"
                    min={2.2}
                    max={4.4}
                    step={0.05}
                    value={recipe.config.layout.aspect}
                    data-testid="aspect"
                    onChange={(event) => patch({ aspect: Number(event.target.value) })}
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Width fit <output>{Math.round(recipe.config.font.fit * 100)}%</output>
                  </span>
                  <input
                    type="range"
                    min={0.65}
                    max={0.94}
                    step={0.01}
                    value={recipe.config.font.fit}
                    onChange={(event) => patch({ fit: Number(event.target.value) })}
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Tracking <output>{recipe.config.font.tracking.toFixed(3)}em</output>
                  </span>
                  <input
                    type="range"
                    min={-0.03}
                    max={0.1}
                    step={0.001}
                    value={recipe.config.font.tracking}
                    onChange={(event) => patch({ tracking: Number(event.target.value) })}
                  />
                </label>
              </fieldset>

              <fieldset className={styles.fieldGroup}>
                <legend>Colour</legend>
                <div className={styles.colorGrid}>
                  {recipe.config.colors.map((color, index) => (
                    <label key={`${index}-${color}`} className={styles.colorField}>
                      <input
                        type="color"
                        value={color}
                        aria-label={`Shader colour ${index + 1}`}
                        onChange={(event) => changeColor(index, event.target.value)}
                      />
                      <span>{color.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className={styles.fieldGroup}>
                <legend>Material</legend>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Speed <output>{sliderValue(recipe.config.material.speed)}</output>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1.2}
                    step={0.01}
                    value={recipe.config.material.speed}
                    onChange={(event) => patchMaterial({ speed: Number(event.target.value) })}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Distortion <output>{sliderValue(recipe.config.material.distortion)}</output>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={2}
                    step={0.01}
                    value={recipe.config.material.distortion}
                    onChange={(event) => patchMaterial({ distortion: Number(event.target.value) })}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>
                    Swirl <output>{sliderValue(recipe.config.material.swirl)}</output>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.01}
                    value={recipe.config.material.swirl}
                    onChange={(event) => patchMaterial({ swirl: Number(event.target.value) })}
                  />
                </label>

                <details className={styles.advanced}>
                  <summary>Material detail</summary>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>
                      Grain mix <output>{sliderValue(recipe.config.material.grainMixer)}</output>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={0.6}
                      step={0.01}
                      value={recipe.config.material.grainMixer}
                      onChange={(event) => patchMaterial({ grainMixer: Number(event.target.value) })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>
                      Grain overlay <output>{sliderValue(recipe.config.material.grainOverlay)}</output>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={0.6}
                      step={0.01}
                      value={recipe.config.material.grainOverlay}
                      onChange={(event) => patchMaterial({ grainOverlay: Number(event.target.value) })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>
                      Field scale <output>{sliderValue(recipe.config.material.scale)}</output>
                    </span>
                    <input
                      type="range"
                      min={0.8}
                      max={1.8}
                      step={0.01}
                      value={recipe.config.material.scale}
                      onChange={(event) => patchMaterial({ scale: Number(event.target.value) })}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>
                      Field rotation <output>{Math.round(recipe.config.material.rotation)}°</output>
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={recipe.config.material.rotation}
                      onChange={(event) => patchMaterial({ rotation: Number(event.target.value) })}
                    />
                  </label>
                </details>
              </fieldset>

              <div className={styles.recipeMeta}>
                <span>SCHEMA {recipe.schemaVersion}</span>
                <span>EFFECT {recipe.effect.version}</span>
                <span>FONT {recipe.config.font.version}</span>
              </div>
            </aside>
          </div>
        </section>

        {notice ? (
          <div className={styles.notice} data-kind={notice.kind} role={notice.kind === "error" ? "alert" : "status"} data-testid="notice">
            <p>{notice.message}</p>
            {notice.kind === "error" && notice.issues ? (
              <ul>
                {notice.issues.slice(0, 6).map((issue) => (
                  <li key={`${issue.path}:${issue.message}`}>
                    <code>{issue.path}</code> {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <section className={styles.recipeSection} aria-labelledby="recipe-title">
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>REPRODUCIBLE CONFIGURATION</p>
            <h2 id="recipe-title">Save the settings, not the frame.</h2>
            <p>
              The recipe stores every supported control, a schema version and a pinned font version.
              It deliberately contains no time value: paused previews compare cleanly, animated output
              does not claim frame-perfect replay.
            </p>
          </div>

          <div className={styles.recipeGrid}>
            <article className={styles.recipeCard}>
              <div className={styles.cardHead}>
                <h3>Export</h3>
                <span>VALIDATED</span>
              </div>
              <textarea readOnly value={recipeJson} aria-label="Current recipe JSON" data-testid="recipe-json" />
              <div className={styles.buttonRow}>
                <button type="button" className={styles.primaryButton} onClick={() => copyText(recipeJson, "Recipe JSON")} data-testid="copy-recipe">
                  Copy recipe
                </button>
                <button type="button" className={styles.secondaryButton} onClick={downloadRecipe} data-testid="download-recipe">
                  Download .json
                </button>
              </div>
            </article>

            <article className={styles.recipeCard}>
              <div className={styles.cardHead}>
                <h3>Import</h3>
                <span>STRICT</span>
              </div>
              <textarea
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder="Paste a Living Type 01 recipe JSON here…"
                aria-label="Recipe JSON to import"
                data-testid="import-json"
              />
              <div className={styles.buttonRow}>
                <button type="button" className={styles.primaryButton} onClick={loadRecipe} data-testid="load-recipe">
                  Validate and load
                </button>
                <button type="button" className={styles.secondaryButton} onClick={() => setImportText(recipeJson)}>
                  Use current
                </button>
              </div>
            </article>
          </div>
        </section>

        <section className={styles.productSection} aria-labelledby="product-title">
          <div className={styles.sectionHead}>
            <p className={styles.eyebrow}>WHAT A DEVELOPER RECEIVES</p>
            <h2 id="product-title">One effect. No Nullworx application.</h2>
          </div>
          <div className={styles.productGrid}>
            <article>
              <span className={styles.cardNumber}>01</span>
              <h3>Portable source</h3>
              <p>
                A client component, scoped CSS Module, recipe contract, JSON Schema and example,
                installed into <code>components/living-type-01</code> by the shadcn registry.
              </p>
            </article>
            <article>
              <span className={styles.cardNumber}>02</span>
              <h3>Real type, real access</h3>
              <p>
                The wordmark is accessible DOM text. Canvas and shader layers are decorative. The
                Unbounded subset is embedded in the installed component, not fetched from a font CDN or package.
              </p>
            </article>
            <article>
              <span className={styles.cardNumber}>03</span>
              <h3>Motion with a brake</h3>
              <p>
                Pause/resume is a prop. Reduced motion defaults to the OS preference and stops the
                Paper render loop entirely. Paused previews are stable stills.
              </p>
            </article>
          </div>

          <div className={styles.installPanel}>
            <div>
              <p className={styles.installLabel}>LOCAL REGISTRY INSTALL</p>
              <code className={styles.installCommand} data-testid="install-command">
                {installCommand}
              </code>
              <p className={styles.installNote}>
                This review build serves the registry at <code>/r/living-type-01.json</code>. No public
                registry admission and no npm publication are part of G5-A.
              </p>
            </div>
            <button type="button" className={styles.primaryButton} onClick={() => copyText(installCommand, "Install command")}>
              Copy command
            </button>
          </div>
        </section>

        <section className={styles.limits} aria-labelledby="limits-title">
          <div>
            <p className={styles.eyebrow}>KNOWN LIMITS</p>
            <h2 id="limits-title">Small print, in plain type.</h2>
          </div>
          <ul>
            <li>Single-line Latin wordmarks only: A–Z, a–z, 0–9, space, and . &amp; &apos; ! ? + - /.</li>
            <li>WebGL2 is required for the shader. Without it the wordmark falls back to real static type.</li>
            <li>Recipes restore configuration and paused stills, not a deterministic animation timeline.</li>
            <li>Custom font families are not supported in this build; the pinned Unbounded face is part of the visual contract.</li>
            <li>This is an experimental owner-review product. It is not deployed, published, or visually approved.</li>
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>NULLWORX / LIVING TYPE 01 / G5-A</span>
        <span>PAPER SHADERS 0.0.82 · APACHE-2.0 · UNBOUNDED 5.3.0 · OFL-1.1</span>
        <span>EXPERIMENTAL · OWNER_REVIEW</span>
      </footer>
    </div>
  );
}
