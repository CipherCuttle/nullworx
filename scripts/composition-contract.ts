import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import {
  DEFAULT_COMPOSITION_REGISTRY,
  HOLOTYPE_MATERIAL,
  MASKS,
  MOTH_MASK,
  MATERIALS,
  PAPER_MATERIAL,
  RECIPES,
  WORDMARK_MASK,
  checkCompatibility,
  maskDefinitionSchema,
  maskViewBox,
  validateRecipe,
  validateRecipeSet,
  type AnyMaterialDefinition,
} from "../lib/composition";
import { maskImageFromSvg } from "../lib/composition/mask-image";
import { EFFECT_DEFINITIONS } from "../lib/effects";

/**
 * G3-A structural contract checks.
 *
 * These do not prove pixels. They prove the registry, the runtime validators,
 * the compatibility rule, provenance and the absence of renderer forks. The
 * browser harness proves the four visible compositions.
 */

let checks = 0;

function check(label: string, fn: () => void) {
  try {
    fn();
  } catch (error) {
    console.error(`FAIL ${label}`);
    throw error;
  }
  checks += 1;
  console.log(`PASS ${label}`);
}

function json(relative: string): unknown {
  return JSON.parse(readFileSync(path.join(process.cwd(), relative), "utf8"));
}

function sha256(relative: string): string {
  return createHash("sha256").update(readFileSync(path.join(process.cwd(), relative))).digest("hex");
}

function walk(relative: string): string[] {
  const root = path.join(process.cwd(), relative);
  const files: string[] = [];
  for (const entry of readdirSync(root)) {
    const target = path.join(relative, entry);
    if (statSync(path.join(process.cwd(), target)).isDirectory()) files.push(...walk(target));
    else files.push(target);
  }
  return files;
}

const maskIds = MASKS.map((mask) => mask.id);
const materialIds = MATERIALS.map((material) => material.effect.id);
const recipeIds = RECIPES.map((recipe) => recipe.id);

check("two masks and two materials are registered", () => {
  assert.equal(MASKS.length, 2);
  assert.equal(MATERIALS.length, 2);
  assert.equal(new Set(maskIds).size, 2);
  assert.equal(new Set(materialIds).size, 2);
});

check("four comparison recipes are registered", () => {
  assert.equal(RECIPES.length, 4);
  assert.equal(new Set(recipeIds).size, 4);
});

check("mask and recipe ids are stable kebab-case with semver versions", () => {
  for (const id of [...maskIds, ...recipeIds]) {
    assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
  for (const entry of [...MASKS, ...RECIPES]) {
    assert.match(entry.version, /^\d+\.\d+\.\d+$/);
  }
});

check("every mask passes the runtime schema", () => {
  for (const mask of MASKS) {
    const result = maskDefinitionSchema.safeParse(mask);
    assert.equal(result.success, true, `${mask.id}: ${result.success ? "" : result.error.message}`);
  }
});

check("mask coordinate systems, fit and alpha are explicit", () => {
  for (const mask of MASKS) {
    assert.equal(maskViewBox(mask), `0 0 ${mask.coordinates.width} ${mask.coordinates.height}`);
    assert.equal(mask.coordinates.preserveAspectRatio, "xMidYMid meet");
    assert.ok(Math.abs(mask.aspectRatio - mask.coordinates.width / mask.coordinates.height) < 1e-9);
    assert.equal(mask.fit, "contain");
    assert.equal(mask.align, "center");
    assert.equal(mask.alpha, "binary");
    assert.equal(mask.geometry.kind, mask.kind);
    assert.ok(mask.unsupportedBehavior.includes("rejected"));
  }
});

check("the wordmark is the fixed NULLWORX text with a browser font policy", () => {
  const text = WORDMARK_MASK.geometry;
  assert.equal(text.kind, "text");
  if (text.kind !== "text") return;
  assert.equal(text.text, "NULLWORX");
  assert.equal(text.font.variable, "--font-geist-sans");
  assert.match(text.font.cssFamily, /var\(--font-geist-sans\)/);
  assert.ok(text.font.fit >= 0.5 && text.font.fit <= 0.95);
  assert.match(text.font.note, /browser|resolved/i);
  assert.doesNotMatch(text.font.note, /http|purchase|proprietary/i);
});

check("the vector mask contains path geometry only, with no external references", () => {
  const image = maskImageFromSvg(MOTH_MASK);
  assert.ok(image.url.startsWith("data:image/svg+xml,"));
  const decoded = decodeURIComponent(image.url.slice(image.url.indexOf(",") + 1));
  assert.ok(decoded.startsWith("<svg"));
  assert.match(decoded, /fill-rule="evenodd"/);
  const withoutNamespace = decoded.replace('xmlns="http://www.w3.org/2000/svg"', "");
  assert.equal(/https?:\/\//.test(withoutNamespace), false, "mask SVG contains an external URL");
  for (const forbidden of ["<script", "xlink:href", "href=", "<image", "url(", "<foreignObject"]) {
    assert.equal(decoded.includes(forbidden), false, `mask SVG contains ${forbidden}`);
  }
});

check("unsafe text and font values are rejected by the mask schema", () => {
  const text = WORDMARK_MASK.geometry;
  if (text.kind !== "text") throw new Error("wordmark is not text");
  for (const candidate of [
    { ...WORDMARK_MASK, geometry: { ...text, text: "<script>alert(1)</script>" } },
    { ...WORDMARK_MASK, geometry: { ...text, text: "NULLWORX; background:url(x)" } },
    {
      ...WORDMARK_MASK,
      geometry: { ...text, font: { ...text.font, cssFamily: "serif; background:url(x)" } },
    },
  ]) {
    assert.equal(maskDefinitionSchema.safeParse(candidate).success, false);
  }
});

check("every material advertises both mask kinds through a real mechanism", () => {
  for (const material of MATERIALS) {
    assert.deepEqual([...material.mask.kinds].sort(), ["svg-path", "text"]);
    assert.ok(["native-geometry", "css-mask"].includes(material.mask.mechanism));
    assert.ok(material.mask.note.length > 20);
  }
  assert.equal(HOLOTYPE_MATERIAL.mask.mechanism, "native-geometry");
  assert.equal(PAPER_MATERIAL.mask.mechanism, "css-mask");
});

check("materials inherit existing EffectDefinition metadata", () => {
  for (const material of MATERIALS) {
    const effect = EFFECT_DEFINITIONS.find((candidate) => candidate.id === material.effect.id);
    assert.ok(effect, `missing effect ${material.effect.id}`);
    assert.equal(material.effect.status, effect.status);
    assert.equal(material.effect.technology, effect.technology);
    assert.equal(material.effect.params, effect.params);
    assert.deepEqual(material.effect.license, effect.license);
    assert.deepEqual(material.effect.provenance, effect.provenance);
  }
});

check("the recipe matrix covers both masks x both materials exactly once", () => {
  const pairs = RECIPES.map((recipe) => `${recipe.mask.id}|${recipe.material.id}`);
  assert.equal(new Set(pairs).size, 4);
  const expected = [
    "nullworx-moth|holotype-foil",
    "nullworx-moth|paper-mesh-gradient",
    "nullworx-wordmark|holotype-foil",
    "nullworx-wordmark|paper-mesh-gradient",
  ];
  assert.deepEqual([...pairs].sort(), [...expected].sort());
});

check("all four valid fixtures validate and are compatible", () => {
  const fixtures = walk("fixtures/composition/valid").filter((file) => file.endsWith(".json"));
  assert.equal(fixtures.length, 4);
  const recipes = fixtures.map((file) => json(file));
  const result = validateRecipeSet(recipes);
  assert.equal(result.ok, true, result.ok ? "" : JSON.stringify(result.issues));
  if (!result.ok) return;
  assert.equal(result.values.length, 4);
  for (const value of result.values) {
    assert.equal(value.compatibility.code, "compatible");
    assert.ok(value.compatibility.message.includes(value.mask.kind));
  }
});

check("valid fixtures match the in-code recipes exactly", () => {
  const fixtures = walk("fixtures/composition/valid").map((file) => json(file) as { id: string });
  for (const recipe of RECIPES) {
    const fixture = fixtures.find((entry) => entry.id === recipe.id);
    assert.ok(fixture, `missing fixture for ${recipe.id}`);
    assert.deepEqual(fixture, recipe);
  }
});

check("each recipe resolves to its declared mask and material versions", () => {
  for (const recipe of RECIPES) {
    const result = validateRecipe(recipe);
    assert.equal(result.ok, true, result.ok ? "" : JSON.stringify(result.issues));
    if (!result.ok) continue;
    assert.equal(result.value.mask.id, recipe.mask.id);
    assert.equal(result.value.mask.version, recipe.mask.version);
    assert.equal(result.value.material.effect.id, recipe.material.id);
    assert.equal(result.value.material.effect.version, recipe.material.version);
  }
});

check("invalid fixtures are rejected with the expected code", () => {
  const cases: Array<[string, string]> = [
    ["unknown-mask.json", "unknown-mask"],
    ["unknown-material.json", "unknown-material"],
    ["version-mismatch.json", "version-mismatch"],
    ["invalid-params.json", "invalid-params"],
    ["malformed.json", "invalid-structure"],
  ];
  for (const [file, code] of cases) {
    const result = validateRecipe(json(`fixtures/composition/invalid/${file}`));
    assert.equal(result.ok, false, `${file} was accepted`);
    if (result.ok) continue;
    assert.ok(
      result.issues.some((issue) => issue.code === code),
      `${file}: expected ${code}, got ${result.issues.map((issue) => issue.code).join(", ")}`,
    );
  }
});

check("a duplicate recipe id is rejected by the set validator", () => {
  const result = validateRecipeSet(json("fixtures/composition/invalid/duplicate-set.json"));
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.issues.some((issue) => issue.code === "duplicate-recipe-id"));
});

check("a constrained material rejects a text mask before render", () => {
  const constrained = {
    ...PAPER_MATERIAL,
    mask: { ...PAPER_MATERIAL.mask, kinds: ["svg-path"] },
  } as AnyMaterialDefinition;
  const compatibility = checkCompatibility(WORDMARK_MASK, constrained);
  assert.equal(compatibility.ok, false);
  if (!compatibility.ok) assert.equal(compatibility.issue.code, "unsupported-mask-kind");

  const wordmarkRecipe = RECIPES.find((recipe) => recipe.mask.id === WORDMARK_MASK.id && recipe.material.id === PAPER_MATERIAL.effect.id);
  assert.ok(wordmarkRecipe);
  const result = validateRecipe(wordmarkRecipe, {
    masks: MASKS,
    materials: [HOLOTYPE_MATERIAL as AnyMaterialDefinition, constrained],
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.issues.some((issue) => issue.code === "unsupported-mask-kind"));
  }
});

check("HoloType source files remain byte-identical to the captured import", () => {
  const manifest = json("docs/import-manifest.json") as {
    holotype: { files: Array<{ target: string; targetSha256: string }> };
  };
  assert.equal(manifest.holotype.files.length, 8);
  for (const file of manifest.holotype.files) {
    assert.equal(sha256(file.target), file.targetSha256, `${file.target} drifted`);
  }
});

check("the paper surface imports upstream and contains no vendored shader", () => {
  const source = readFileSync(
    path.join(process.cwd(), "components/labs/composition/surfaces/paper-surface.tsx"),
    "utf8",
  );
  assert.match(source, /@paper-design\/shaders-react/);
  for (const forbidden of ["gl_FragColor", "precision highp", "ShaderMaterial", "fragmentShader", "new WebGLRenderer"]) {
    assert.equal(source.includes(forbidden), false, `paper surface contains ${forbidden}`);
  }
  assert.equal(existsSync("third_party/paper-design"), false);
});

check("the surface registry has one entry per material family", () => {
  const source = readFileSync(
    path.join(process.cwd(), "components/labs/composition/surface-registry.ts"),
    "utf8",
  );
  const entries = [...source.matchAll(/^\s{2}(holotype|paper):/gm)].map((match) => match[1]);
  assert.deepEqual(entries.sort(), ["holotype", "paper"]);
  const surfaces = new Set(MATERIALS.map((material) => material.surface));
  assert.deepEqual([...surfaces].sort(), ["holotype", "paper"]);
});

check("no renderer surface references a recipe or combination id", () => {
  const files = walk("components/labs/composition/surfaces").filter((file) => file.endsWith(".tsx"));
  for (const file of files) {
    const source = readFileSync(path.join(process.cwd(), file), "utf8");
    for (const id of recipeIds) {
      assert.equal(source.includes(id), false, `${file} references ${id}`);
    }
  }
});

check("no new runtime dependencies were added", () => {
  const pkg = json("package.json") as { dependencies: Record<string, string> };
  const expected = [
    "@paper-design/shaders-react",
    "@radix-ui/react-label",
    "@radix-ui/react-slot",
    "class-variance-authority",
    "clsx",
    "lucide-react",
    "motion",
    "next",
    "react",
    "react-dom",
    "tailwind-merge",
    "tw-animate-css",
    "zod",
  ];
  assert.deepEqual(Object.keys(pkg.dependencies).sort(), expected);
  for (const name of Object.keys(pkg.dependencies)) {
    assert.doesNotMatch(name, /^(ogl|three|pixi|pixi\.js|p5|regl|babylon)/);
  }
});

check("export declarations stay source-level only", () => {
  for (const material of MATERIALS) {
    assert.deepEqual([...material.effect.exportTargets], ["react-component"]);
    assert.match(material.exportCapability, /no (PNG|image|video)/i);
  }
});

check("licenses and provenance are present and notice files exist", () => {
  for (const mask of MASKS) {
    assert.ok(mask.provenance.notes.length > 20);
    assert.equal(mask.license.holder, "Nullworx owner");
  }
  assert.match(MOTH_MASK.provenance.notes, /created|authored/i);
  assert.match(WORDMARK_MASK.provenance.notes, /no font file|No font file|Geist/i);
  for (const material of MATERIALS) {
    assert.ok(material.effect.license.notices.length > 0);
    for (const notice of material.effect.license.notices) {
      assert.equal(existsSync(notice), true, `missing notice ${notice}`);
    }
  }
  assert.equal(HOLOTYPE_MATERIAL.effect.license.redistribution, "restricted");
  assert.equal(PAPER_MATERIAL.effect.license.spdx, "Apache-2.0");
});

check("the lab route is noindex and unlinked from released routes", () => {
  const page = readFileSync(path.join(process.cwd(), "app/labs/composition/page.tsx"), "utf8");
  assert.match(page, /index:\s*false/);
  for (const released of [
    "app/page.tsx",
    "components/forge-gallery.tsx",
    "components/labs/effect-lab.tsx",
    "app/labs/effects/page.tsx",
  ]) {
    assert.equal(readFileSync(released, "utf8").includes("/labs/composition"), false, `${released} links the lab`);
  }
});

check("the default registry is the live registry and exposes four recipes", () => {
  assert.equal(DEFAULT_COMPOSITION_REGISTRY.masks.length, 2);
  assert.equal(DEFAULT_COMPOSITION_REGISTRY.materials.length, 2);
  const result = validateRecipeSet(RECIPES);
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.values.length, 4);
});

console.log(`\n${checks}/${checks} composition contract checks passed.`);
