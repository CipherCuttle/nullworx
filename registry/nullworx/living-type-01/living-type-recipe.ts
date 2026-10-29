/**
 * NULLWORX / LIVING TYPE 01 — recipe contract.
 *
 * This file is dependency-free so it can validate recipes on the server, in a
 * build script, or in a consumer test without mounting the shader.
 */

export const LIVING_TYPE_SCHEMA_VERSION = "1.0.0" as const;
export const LIVING_TYPE_EFFECT_ID = "living-type-01" as const;
export const LIVING_TYPE_EFFECT_VERSION = "1.0.0" as const;
export const LIVING_TYPE_FONT_FAMILY = "Unbounded Variable" as const;
export const LIVING_TYPE_FONT_VERSION = "5.3.0" as const;
export const LIVING_TYPE_TEXT_MAX = 24;
export const LIVING_TYPE_TEXT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .&'!?+\-/]*$/;
export const LIVING_TYPE_SUPPORTED_CHARACTERS =
  "A–Z, a–z, 0–9, space, . & ' ! ? + - /";

export const PRESET_IDS = ["night-bloom", "kiln", "low-tide"] as const;
export type LivingTypePresetId = (typeof PRESET_IDS)[number];

export type ReducedMotionPreference = "auto" | "force";

export type LivingTypeColors = [string, string, string, string];

export interface LivingTypeFont {
  family: typeof LIVING_TYPE_FONT_FAMILY;
  version: typeof LIVING_TYPE_FONT_VERSION;
  weight: number;
  fit: number;
  tracking: number;
}

export interface LivingTypeLayout {
  /** width / height of the composition frame. */
  aspect: number;
}

export interface LivingTypeMaterial {
  speed: number;
  distortion: number;
  swirl: number;
  grainMixer: number;
  grainOverlay: number;
  scale: number;
  rotation: number;
}

export interface LivingTypePlayback {
  paused: boolean;
  reducedMotion: ReducedMotionPreference;
}

export interface LivingTypeConfig {
  text: string;
  preset: LivingTypePresetId;
  font: LivingTypeFont;
  layout: LivingTypeLayout;
  colors: LivingTypeColors;
  material: LivingTypeMaterial;
  playback: LivingTypePlayback;
}

export interface LivingTypeRecipe {
  $schema?: string;
  schemaVersion: typeof LIVING_TYPE_SCHEMA_VERSION;
  effect: {
    id: typeof LIVING_TYPE_EFFECT_ID;
    version: typeof LIVING_TYPE_EFFECT_VERSION;
  };
  id: string;
  version: string;
  title: string;
  config: LivingTypeConfig;
}

export interface RecipeIssue {
  path: string;
  message: string;
}

export type RecipeParseResult =
  | { ok: true; recipe: LivingTypeRecipe }
  | { ok: false; issues: RecipeIssue[] };

export interface LivingTypePreset {
  id: LivingTypePresetId;
  name: string;
  description: string;
  config: LivingTypeConfig;
}

const FONT = {
  family: LIVING_TYPE_FONT_FAMILY,
  version: LIVING_TYPE_FONT_VERSION,
} as const;

/**
 * Three art directions. They differ in type weight, tracking, frame ratio,
 * shader motion, grain, palette, and surface treatment — not just hue.
 */
export const LIVING_TYPE_PRESETS: readonly LivingTypePreset[] = [
  {
    id: "night-bloom",
    name: "Night Bloom",
    description:
      "Ultraviolet and apricot currents on near-black. Tight display weight, soft bloom, restless colour.",
    config: {
      text: "NULLWORX",
      preset: "night-bloom",
      font: { ...FONT, weight: 700, fit: 0.9, tracking: 0.012 },
      layout: { aspect: 3.15 },
      colors: ["#E9D5FF", "#7C3AED", "#F97316", "#22D3EE"],
      material: {
        speed: 0.22,
        distortion: 1.1,
        swirl: 0.35,
        grainMixer: 0.08,
        grainOverlay: 0.08,
        scale: 1.25,
        rotation: 20,
      },
      playback: { paused: false, reducedMotion: "auto" },
    },
  },
  {
    id: "kiln",
    name: "Kiln",
    description:
      "Fired earth on warm paper. Heavy type, low motion, coarse grain and an ochre cast.",
    config: {
      text: "NULLWORX",
      preset: "kiln",
      font: { ...FONT, weight: 800, fit: 0.88, tracking: -0.018 },
      layout: { aspect: 3.35 },
      colors: ["#7C2D12", "#C2410C", "#F59E0B", "#FFF7ED"],
      material: {
        speed: 0.13,
        distortion: 0.55,
        swirl: 0.15,
        grainMixer: 0.22,
        grainOverlay: 0.18,
        scale: 1.45,
        rotation: 340,
      },
      playback: { paused: false, reducedMotion: "auto" },
    },
  },
  {
    id: "low-tide",
    name: "Low Tide",
    description:
      "Cold water on sea-glass paper. Light, widely tracked type with a slow lateral drift.",
    config: {
      text: "NULLWORX",
      preset: "low-tide",
      font: { ...FONT, weight: 400, fit: 0.82, tracking: 0.065 },
      layout: { aspect: 2.85 },
      colors: ["#0F766E", "#0891B2", "#1D4ED8", "#ECFEFF"],
      material: {
        speed: 0.3,
        distortion: 0.35,
        swirl: 0.8,
        grainMixer: 0.05,
        grainOverlay: 0.04,
        scale: 1.6,
        rotation: 290,
      },
      playback: { paused: false, reducedMotion: "auto" },
    },
  },
];

export const DEFAULT_PRESET_ID: LivingTypePresetId = "night-bloom";

export function getPreset(id: LivingTypePresetId): LivingTypePreset {
  const preset = LIVING_TYPE_PRESETS.find((entry) => entry.id === id);
  if (!preset) throw new Error(`Unknown Living Type preset: ${id}`);
  return preset;
}

function cloneConfig(config: LivingTypeConfig): LivingTypeConfig {
  return {
    ...config,
    font: { ...config.font },
    layout: { ...config.layout },
    colors: [...config.colors] as LivingTypeColors,
    material: { ...config.material },
    playback: { ...config.playback },
  };
}

export interface LivingTypeRecipeOptions {
  id?: string;
  version?: string;
  title?: string;
  preset?: LivingTypePresetId;
  text?: string;
  paused?: boolean;
  reducedMotion?: ReducedMotionPreference;
  weight?: number;
  fit?: number;
  tracking?: number;
  aspect?: number;
  colors?: LivingTypeColors;
  material?: Partial<LivingTypeMaterial>;
}

/**
 * Build a complete, self-contained recipe. Presets only supply defaults: the
 * stored colours, type metrics and material values are always explicit so a
 * saved recipe does not drift when preset defaults change.
 */
export function createLivingTypeRecipe(options: LivingTypeRecipeOptions = {}): LivingTypeRecipe {
  const preset = getPreset(options.preset ?? DEFAULT_PRESET_ID);
  const config = cloneConfig(preset.config);
  if (options.text !== undefined) config.text = options.text;
  if (options.paused !== undefined) config.playback.paused = options.paused;
  if (options.reducedMotion !== undefined) config.playback.reducedMotion = options.reducedMotion;
  if (options.weight !== undefined) config.font.weight = options.weight;
  if (options.fit !== undefined) config.font.fit = options.fit;
  if (options.tracking !== undefined) config.font.tracking = options.tracking;
  if (options.aspect !== undefined) config.layout.aspect = options.aspect;
  if (options.colors !== undefined) config.colors = [...options.colors] as LivingTypeColors;
  if (options.material !== undefined) config.material = { ...config.material, ...options.material };

  const recipe: LivingTypeRecipe = {
    schemaVersion: LIVING_TYPE_SCHEMA_VERSION,
    effect: { id: LIVING_TYPE_EFFECT_ID, version: LIVING_TYPE_EFFECT_VERSION },
    id: options.id ?? "nullworx-living-type-01",
    version: options.version ?? "1.0.0",
    title: options.title ?? `${config.text} / ${preset.name}`,
    config,
  };
  const parsed = parseLivingTypeRecipe(recipe);
  if (!parsed.ok) {
    throw new Error(
      `Invalid Living Type recipe: ${parsed.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`,
    );
  }
  return parsed.recipe;
}

/**
 * Update an existing recipe while preserving its id, version and title.
 * Changing the preset intentionally resets the preset-owned visual defaults
 * while preserving the wordmark, title and playback choices.
 */
export function updateLivingTypeRecipe(
  recipe: LivingTypeRecipe,
  patch: LivingTypeRecipeOptions,
): LivingTypeRecipe {
  const presetChanged = patch.preset !== undefined && patch.preset !== recipe.config.preset;
  return createLivingTypeRecipe({
    id: patch.id ?? recipe.id,
    version: patch.version ?? recipe.version,
    title: patch.title ?? recipe.title,
    preset: patch.preset ?? recipe.config.preset,
    text: patch.text ?? recipe.config.text,
    paused: patch.paused ?? recipe.config.playback.paused,
    reducedMotion: patch.reducedMotion ?? recipe.config.playback.reducedMotion,
    ...(presetChanged
      ? {}
      : {
          weight: patch.weight ?? recipe.config.font.weight,
          fit: patch.fit ?? recipe.config.font.fit,
          tracking: patch.tracking ?? recipe.config.font.tracking,
          aspect: patch.aspect ?? recipe.config.layout.aspect,
          colors: patch.colors ?? recipe.config.colors,
          material: { ...recipe.config.material, ...patch.material },
        }),
  });
}

const RECIPE_KEYS = new Set([
  "$schema",
  "schemaVersion",
  "effect",
  "id",
  "version",
  "title",
  "config",
]);
const CONFIG_KEYS = new Set([
  "text",
  "preset",
  "font",
  "layout",
  "colors",
  "material",
  "playback",
]);
const FONT_KEYS = new Set(["family", "version", "weight", "fit", "tracking"]);
const LAYOUT_KEYS = new Set(["aspect"]);
const MATERIAL_KEYS = new Set([
  "speed",
  "distortion",
  "swirl",
  "grainMixer",
  "grainOverlay",
  "scale",
  "rotation",
]);
const PLAYBACK_KEYS = new Set(["paused", "reducedMotion"]);

export const DEFAULT_LIVING_TYPE_RECIPE = createLivingTypeRecipe({
  id: "nullworx-living-type-01",
  title: "NULLWORX / Night Bloom",
});

export const RECIPE_EXAMPLE = DEFAULT_LIVING_TYPE_RECIPE;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnknown(
  value: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
  issues: RecipeIssue[],
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push({ path: path ? `${path}.${key}` : key, message: "unknown field" });
    }
  }
}

function readString(
  value: unknown,
  path: string,
  issues: RecipeIssue[],
  limits: { min?: number; max: number; pattern?: RegExp; label: string },
): string | null {
  if (typeof value !== "string") {
    issues.push({ path, message: `expected ${limits.label}` });
    return null;
  }
  if (value.length < (limits.min ?? 1) || value.length > limits.max) {
    issues.push({
      path,
      message: `expected ${limits.label} between ${limits.min ?? 1} and ${limits.max} characters`,
    });
    return null;
  }
  if (limits.pattern && !limits.pattern.test(value)) {
    issues.push({ path, message: `expected ${limits.label}` });
    return null;
  }
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    issues.push({ path, message: "control characters are not allowed" });
    return null;
  }
  return value;
}

function readNumber(
  value: unknown,
  path: string,
  issues: RecipeIssue[],
  limits: { min: number; max: number; integer?: boolean; step?: number; label: string },
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({ path, message: `expected ${limits.label}` });
    return null;
  }
  if (value < limits.min || value > limits.max) {
    issues.push({
      path,
      message: `${limits.label} must be between ${limits.min} and ${limits.max}`,
    });
    return null;
  }
  if (limits.integer && !Number.isInteger(value)) {
    issues.push({ path, message: `${limits.label} must be an integer` });
    return null;
  }
  if (limits.step && Math.abs(value / limits.step - Math.round(value / limits.step)) > 1e-9) {
    issues.push({ path, message: `${limits.label} must use steps of ${limits.step}` });
    return null;
  }
  return value;
}

function readBoolean(value: unknown, path: string, issues: RecipeIssue[]): boolean | null {
  if (typeof value !== "boolean") {
    issues.push({ path, message: "expected a boolean" });
    return null;
  }
  return value;
}

function readHex(value: unknown, path: string, issues: RecipeIssue[]): string | null {
  if (typeof value !== "string" || !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)) {
    issues.push({ path, message: "expected a #RGB or #RRGGBB colour" });
    return null;
  }
  return value;
}

function parseColors(value: unknown, path: string, issues: RecipeIssue[]): LivingTypeColors | null {
  if (!Array.isArray(value) || value.length !== 4) {
    issues.push({ path, message: "expected exactly four colours" });
    return null;
  }
  const colors = value.map((entry, index) => readHex(entry, `${path}.${index}`, issues));
  if (colors.some((entry) => entry === null)) return null;
  return colors as LivingTypeColors;
}

/**
 * Strict, non-coercing validation. Unknown fields are rejected so a recipe can
 * never smuggle arbitrary CSS, markup or executable configuration into the
 * component. The returned recipe is rebuilt from validated primitives.
 */
export function parseLivingTypeRecipe(input: unknown): RecipeParseResult {
  const issues: RecipeIssue[] = [];
  let value: unknown = input;

  if (typeof input === "string") {
    try {
      value = JSON.parse(input) as unknown;
    } catch {
      return { ok: false, issues: [{ path: "(root)", message: "recipe is not valid JSON" }] };
    }
  }

  if (!isRecord(value)) {
    return { ok: false, issues: [{ path: "(root)", message: "recipe must be an object" }] };
  }

  rejectUnknown(value, RECIPE_KEYS, "", issues);

  if (value.$schema !== undefined) {
    readString(value.$schema, "$schema", issues, { max: 300, label: "a schema path" });
  }

  if (value.schemaVersion !== LIVING_TYPE_SCHEMA_VERSION) {
    issues.push({
      path: "schemaVersion",
      message: `unsupported schema version ${JSON.stringify(value.schemaVersion)}; this build supports ${LIVING_TYPE_SCHEMA_VERSION}`,
    });
  }

  const effect = isRecord(value.effect) ? value.effect : null;
  if (!effect) {
    issues.push({ path: "effect", message: "expected an effect object" });
  } else {
    rejectUnknown(effect, new Set(["id", "version"]), "effect", issues);
    if (effect.id !== LIVING_TYPE_EFFECT_ID) {
      issues.push({
        path: "effect.id",
        message: `expected "${LIVING_TYPE_EFFECT_ID}", received ${JSON.stringify(effect.id)}`,
      });
    }
    if (effect.version !== LIVING_TYPE_EFFECT_VERSION) {
      issues.push({
        path: "effect.version",
        message: `recipe targets effect ${JSON.stringify(effect.version)}; this build is ${LIVING_TYPE_EFFECT_VERSION}`,
      });
    }
  }

  const id = readString(value.id, "id", issues, {
    max: 64,
    pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    label: "a kebab-case recipe id",
  });
  const version = readString(value.version, "version", issues, {
    max: 20,
    pattern: /^\d+\.\d+\.\d+$/,
    label: "a semver recipe version",
  });
  const title = readString(value.title, "title", issues, { max: 80, label: "a title" });

  const configValue = isRecord(value.config) ? value.config : null;
  let config: LivingTypeConfig | null = null;

  if (!configValue) {
    issues.push({ path: "config", message: "expected a config object" });
  } else {
    rejectUnknown(configValue, CONFIG_KEYS, "config", issues);

    const text = readString(configValue.text, "config.text", issues, {
      min: 1,
      max: LIVING_TYPE_TEXT_MAX,
      pattern: LIVING_TYPE_TEXT_PATTERN,
      label: `a single-line wordmark using ${LIVING_TYPE_SUPPORTED_CHARACTERS}`,
    });
    if (text && text.trim() !== text) {
      issues.push({
        path: "config.text",
        message: "leading or trailing spaces are not allowed",
      });
    }
    const preset =
      typeof configValue.preset === "string" &&
      (PRESET_IDS as readonly string[]).includes(configValue.preset)
        ? (configValue.preset as LivingTypePresetId)
        : null;
    if (!preset) {
      issues.push({
        path: "config.preset",
        message: `expected one of ${PRESET_IDS.join(", ")}`,
      });
    }

    const fontValue = isRecord(configValue.font) ? configValue.font : null;
    let font: LivingTypeFont | null = null;
    if (!fontValue) {
      issues.push({ path: "config.font", message: "expected a font object" });
    } else {
      rejectUnknown(fontValue, FONT_KEYS, "config.font", issues);
      if (fontValue.family !== LIVING_TYPE_FONT_FAMILY) {
        issues.push({
          path: "config.font.family",
          message: `expected "${LIVING_TYPE_FONT_FAMILY}"; custom families are not supported by this build`,
        });
      }
      if (fontValue.version !== LIVING_TYPE_FONT_VERSION) {
        issues.push({
          path: "config.font.version",
          message: `recipe targets font ${JSON.stringify(fontValue.version)}; this build is ${LIVING_TYPE_FONT_VERSION}`,
        });
      }
      const weight = readNumber(fontValue.weight, "config.font.weight", issues, {
        min: 200,
        max: 900,
        integer: true,
        step: 100,
        label: "font weight",
      });
      const fit = readNumber(fontValue.fit, "config.font.fit", issues, {
        min: 0.55,
        max: 0.94,
        label: "fit",
      });
      const tracking = readNumber(fontValue.tracking, "config.font.tracking", issues, {
        min: -0.04,
        max: 0.14,
        label: "tracking",
      });
      if (
        fontValue.family === LIVING_TYPE_FONT_FAMILY &&
        fontValue.version === LIVING_TYPE_FONT_VERSION &&
        weight !== null &&
        fit !== null &&
        tracking !== null
      ) {
        font = { family: LIVING_TYPE_FONT_FAMILY, version: LIVING_TYPE_FONT_VERSION, weight, fit, tracking };
      }
    }

    const layoutValue = isRecord(configValue.layout) ? configValue.layout : null;
    let layout: LivingTypeLayout | null = null;
    if (!layoutValue) {
      issues.push({ path: "config.layout", message: "expected a layout object" });
    } else {
      rejectUnknown(layoutValue, LAYOUT_KEYS, "config.layout", issues);
      const aspect = readNumber(layoutValue.aspect, "config.layout.aspect", issues, {
        min: 2,
        max: 5,
        label: "aspect ratio",
      });
      if (aspect !== null) layout = { aspect };
    }

    const colors = parseColors(configValue.colors, "config.colors", issues);

    const materialValue = isRecord(configValue.material) ? configValue.material : null;
    let material: LivingTypeMaterial | null = null;
    if (!materialValue) {
      issues.push({ path: "config.material", message: "expected a material object" });
    } else {
      rejectUnknown(materialValue, MATERIAL_KEYS, "config.material", issues);
      const speed = readNumber(materialValue.speed, "config.material.speed", issues, {
        min: 0,
        max: 2,
        label: "speed",
      });
      const distortion = readNumber(
        materialValue.distortion,
        "config.material.distortion",
        issues,
        { min: 0, max: 2, label: "distortion" },
      );
      const swirl = readNumber(materialValue.swirl, "config.material.swirl", issues, {
        min: 0,
        max: 1.5,
        label: "swirl",
      });
      const grainMixer = readNumber(
        materialValue.grainMixer,
        "config.material.grainMixer",
        issues,
        { min: 0, max: 1, label: "grainMixer" },
      );
      const grainOverlay = readNumber(
        materialValue.grainOverlay,
        "config.material.grainOverlay",
        issues,
        { min: 0, max: 1, label: "grainOverlay" },
      );
      const scale = readNumber(materialValue.scale, "config.material.scale", issues, {
        min: 0.5,
        max: 2,
        label: "scale",
      });
      const rotation = readNumber(materialValue.rotation, "config.material.rotation", issues, {
        min: 0,
        max: 360,
        label: "rotation",
      });
      if (
        speed !== null &&
        distortion !== null &&
        swirl !== null &&
        grainMixer !== null &&
        grainOverlay !== null &&
        scale !== null &&
        rotation !== null
      ) {
        material = { speed, distortion, swirl, grainMixer, grainOverlay, scale, rotation };
      }
    }

    const playbackValue = isRecord(configValue.playback) ? configValue.playback : null;
    let playback: LivingTypePlayback | null = null;
    if (!playbackValue) {
      issues.push({ path: "config.playback", message: "expected a playback object" });
    } else {
      rejectUnknown(playbackValue, PLAYBACK_KEYS, "config.playback", issues);
      const paused = readBoolean(playbackValue.paused, "config.playback.paused", issues);
      const reducedMotion =
        playbackValue.reducedMotion === "auto" || playbackValue.reducedMotion === "force"
          ? playbackValue.reducedMotion
          : null;
      if (!reducedMotion) {
        issues.push({
          path: "config.playback.reducedMotion",
          message: 'expected "auto" or "force"',
        });
      }
      if (paused !== null && reducedMotion) playback = { paused, reducedMotion };
    }

    if (
      text &&
      preset &&
      font &&
      layout &&
      colors &&
      material &&
      playback
    ) {
      config = { text, preset, font, layout, colors, material, playback };
    }
  }

  if (issues.length > 0 || !config || !id || !version || !title) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    recipe: {
      schemaVersion: LIVING_TYPE_SCHEMA_VERSION,
      effect: { id: LIVING_TYPE_EFFECT_ID, version: LIVING_TYPE_EFFECT_VERSION },
      id,
      version,
      title,
      config,
    },
  };
}

export function stringifyLivingTypeRecipe(input: unknown): string {
  const parsed = parseLivingTypeRecipe(input);
  if (!parsed.ok) {
    throw new Error(
      `Cannot serialise an invalid Living Type recipe: ${parsed.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return `${JSON.stringify(parsed.recipe, null, 2)}\n`;
}

/** Convert #RGB/#RRGGBB into a space-separated RGB triplet for CSS. */
export function hexToRgbTriplet(hex: string): string {
  if (!/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) {
    throw new Error(`Unsafe colour: ${hex}`);
  }
  const value =
    hex.length === 4
      ? `${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex.slice(1);
  return `${Number.parseInt(value.slice(0, 2), 16)} ${Number.parseInt(value.slice(2, 4), 16)} ${Number.parseInt(value.slice(4, 6), 16)}`;
}
