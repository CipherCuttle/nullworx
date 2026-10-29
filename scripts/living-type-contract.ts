import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEFAULT_LIVING_TYPE_RECIPE,
  LIVING_TYPE_PRESETS,
  LIVING_TYPE_TEXT_PATTERN,
  PRESET_IDS,
  createLivingTypeRecipe,
  hexToRgbTriplet,
  parseLivingTypeRecipe,
  stringifyLivingTypeRecipe,
  updateLivingTypeRecipe,
} from "../registry/nullworx/living-type-01/living-type-recipe";
import { maskCacheKey, shortHash, type MaskRequest } from "../registry/nullworx/living-type-01/living-type-mask";

const checks: string[] = [];
const check = (name: string, condition: boolean) => {
  assert.ok(condition, name);
  checks.push(name);
};

check("three curated presets exist", LIVING_TYPE_PRESETS.length === 3);
check("preset ids are stable", JSON.stringify(LIVING_TYPE_PRESETS.map((entry) => entry.id)) === JSON.stringify(PRESET_IDS));
check("preset types are meaningfully distinct", new Set(LIVING_TYPE_PRESETS.map((entry) => `${entry.config.font.weight}|${entry.config.font.tracking}|${entry.config.layout.aspect}|${entry.config.material.speed}`)).size === 3);
check("default recipe validates", parseLivingTypeRecipe(DEFAULT_LIVING_TYPE_RECIPE).ok);
check("default text is NULLWORX", DEFAULT_LIVING_TYPE_RECIPE.config.text === "NULLWORX");

for (const preset of LIVING_TYPE_PRESETS) {
  const recipe = createLivingTypeRecipe({ preset: preset.id, text: "ACME/01", paused: true });
  const parsed = parseLivingTypeRecipe(recipe);
  check(`${preset.id} builds a complete recipe`, parsed.ok && parsed.recipe.config.colors.length === 4 && parsed.recipe.config.playback.paused);
  const roundTrip = parseLivingTypeRecipe(stringifyLivingTypeRecipe(recipe));
  check(`${preset.id} serialises and parses identically`, roundTrip.ok && JSON.stringify(roundTrip.recipe) === JSON.stringify(recipe));
}

const changedPreset = updateLivingTypeRecipe(DEFAULT_LIVING_TYPE_RECIPE, { preset: "kiln", text: "KILN/07" });
check("preset update preserves text and resets type to the preset", changedPreset.config.text === "KILN/07" && changedPreset.config.preset === "kiln" && changedPreset.config.colors[0] === "#7C2D12");
check("preset update preserves the stable id/version", changedPreset.id === DEFAULT_LIVING_TYPE_RECIPE.id && changedPreset.version === "1.0.0");

function invalid(name: string, value: unknown, expectedPath: string) {
  const parsed = parseLivingTypeRecipe(value);
  check(`reject ${name}`, !parsed.ok && parsed.issues.some((issue) => issue.path === expectedPath));
}
const clone = (value: unknown) => JSON.parse(JSON.stringify(value));
const unsupportedSchema = clone(DEFAULT_LIVING_TYPE_RECIPE); unsupportedSchema.schemaVersion = "2.0.0";
invalid("unsupported schema version", unsupportedSchema, "schemaVersion");
const unsupportedEffect = clone(DEFAULT_LIVING_TYPE_RECIPE); unsupportedEffect.effect.version = "0.9.0";
invalid("unsupported effect version", unsupportedEffect, "effect.version");
const unsupportedFont = clone(DEFAULT_LIVING_TYPE_RECIPE); unsupportedFont.config.font.version = "5.2.0";
invalid("unsupported font version", unsupportedFont, "config.font.version");
const unknownField = clone(DEFAULT_LIVING_TYPE_RECIPE); unknownField.config.style = "background:url(x)";
invalid("unknown config field", unknownField, "config.style");
const badColor = clone(DEFAULT_LIVING_TYPE_RECIPE); badColor.config.colors[0] = "red; background:url(x)";
invalid("non-hex colour", badColor, "config.colors.0");
const badSpeed = clone(DEFAULT_LIVING_TYPE_RECIPE); badSpeed.config.material.speed = 9;
invalid("out-of-range material parameter", badSpeed, "config.material.speed");
const unicode = clone(DEFAULT_LIVING_TYPE_RECIPE); unicode.config.text = "NULLWÖRX";
invalid("unsupported unicode", unicode, "config.text");
const markup = clone(DEFAULT_LIVING_TYPE_RECIPE); markup.config.text = "<svg/onload=alert(1)>";
invalid("markup in the wordmark", markup, "config.text");
const longText = clone(DEFAULT_LIVING_TYPE_RECIPE); longText.config.text = "A".repeat(25);
invalid("wordmark over 24 characters", longText, "config.text");
const whitespace = clone(DEFAULT_LIVING_TYPE_RECIPE); whitespace.config.text = " NULLWORX";
invalid("leading whitespace", whitespace, "config.text");
const poisoned = stringifyLivingTypeRecipe(DEFAULT_LIVING_TYPE_RECIPE).replace("{", '{"__proto__":{"polluted":true},');
const prototypeParsed = parseLivingTypeRecipe(poisoned);
check("prototype fields are rejected, not merged", !prototypeParsed.ok && prototypeParsed.issues.some((issue) => issue.path === "__proto__") && (({} as { polluted?: boolean }).polluted === undefined));

const badJson = parseLivingTypeRecipe("{ not json");
check("malformed JSON is rejected clearly", !badJson.ok && badJson.issues[0].path === "(root)");
check("markup is not a supported character set", !LIVING_TYPE_TEXT_PATTERN.test("<img>"));
check("ampersands and punctuation are supported", LIVING_TYPE_TEXT_PATTERN.test("A&B/01!? +-."));
check("hex triplet conversion is safe", hexToRgbTriplet("#7C3AED") === "124 58 237");

function request(overrides: Partial<MaskRequest> = {}): MaskRequest {
  return {
    text: "NULLWORX",
    weight: 700,
    fit: 0.9,
    tracking: 0.012,
    aspect: 3.15,
    rasterWidth: 1200,
    rasterHeight: 381,
    pixelRatio: 1,
    fontStatus: "loaded",
    fontFamily: "Unbounded Variable",
    fontVersion: "5.3.0",
    ...overrides,
  };
}
const baseKey = maskCacheKey(request());
const keyPatches: [string, Partial<MaskRequest>][] = [
  ["text", { text: "ATLAS/01" }],
  ["weight", { weight: 800 }],
  ["fit", { fit: 0.8 }],
  ["tracking", { tracking: 0.05 }],
  ["aspect", { aspect: 2.9 }],
  ["raster width", { rasterWidth: 1600 }],
  ["raster height", { rasterHeight: 500 }],
  ["DPR/pixel ratio", { pixelRatio: 2 }],
  ["font version", { fontVersion: "5.2.0" as unknown as MaskRequest["fontVersion"] }],
  ["font status", { fontStatus: "fallback" }],
];
for (const [name, patch] of keyPatches) {
  check(`mask key changes with ${name}`, maskCacheKey(request(patch)) !== baseKey);
}
check("mask key does not depend on a component id", !baseKey.includes("living-type-01"));
check("mask key is stable for identical inputs", maskCacheKey(request()) === baseKey);
check("short hash is stable", shortHash(baseKey) === shortHash(baseKey) && shortHash(baseKey).length === 8);

const schema = JSON.parse(readFileSync("registry/nullworx/living-type-01/living-type.recipe.schema.json", "utf8"));
const example = JSON.parse(readFileSync("registry/nullworx/living-type-01/living-type.recipe.example.json", "utf8"));
check("schema pins the same schema version", schema.properties.schemaVersion.const === DEFAULT_LIVING_TYPE_RECIPE.schemaVersion);
check("example parses under the runtime contract", parseLivingTypeRecipe(example).ok);
check("schema requires the runtime config fields", ["text", "preset", "font", "layout", "colors", "material", "playback"].every((key) => schema.properties.config.required.includes(key)));
check("schema forbids global CSS-style extra fields", schema.additionalProperties === false && schema.properties.config.additionalProperties === false);

console.log(`${checks.length}/${checks.length} Living Type contract checks passed.`);
