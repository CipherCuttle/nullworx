import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { registrySchema, registryItemSchema } from "shadcn/schema";

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

const forge = await readJson("registry.json");
registrySchema.parse(forge);
assert.deepEqual(
  forge.items.map((item) => item.name),
  ["command-button", "signal-card", "reveal-heading"],
  "The UI Forge foundation registry must remain exactly three items",
);

const g5a = await readJson("registry.g5a.json");
registrySchema.parse(g5a);
assert.deepEqual(g5a.items.map((item) => item.name), ["living-type-01"]);
assert.equal(g5a.items.length, 1, "G5-A must ship exactly one installable effect item");

if (process.argv.includes("--sync")) {
  await writeFile("public/r/registry.json", JSON.stringify(forge, null, 2) + "\n");
}
assert.deepEqual(
  await readJson("public/r/registry.json"),
  forge,
  "UI Forge public registry index is stale or contains a non-gallery item",
);

for (const item of forge.items) {
  const built = await readJson(`public/r/${item.name}.json`);
  registryItemSchema.parse(built);
  assert.equal(built.name, item.name);
  assert.equal(built.files.length, 2, "Each UI Forge item must include its TSX and CSS Module");
  assert.equal(built.dependencies?.length ?? 0, 0);
  assert.equal(built.registryDependencies?.length ?? 0, 0);
  assert.equal(built.css, undefined, "Consumer global CSS must not be injected");
  assert.equal(built.cssVars, undefined, "Consumer global tokens must not be injected");
  for (const file of built.files) {
    assert.equal(file.content, await readFile(file.path, "utf8"), `${file.path} is stale`);
    if (file.path.endsWith(".tsx")) {
      assert.ok(file.content.includes(`./${item.name}.module.css`), "Missing colocated CSS import");
      const imports = [...file.content.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
      assert.deepEqual(imports, ["react", `./${item.name}.module.css`]);
    } else {
      assert.equal(path.extname(file.path), ".css");
      assert.ok(!/:global|:root|@import|@tailwind|@apply/.test(file.content), "Unscoped CSS found");
      assert.ok(file.content.includes("prefers-reduced-motion"));
    }
  }
  console.log(`PASS ${item.name}: shadcn schema, source parity, scoped CSS, no extra dependencies`);
}

const item = g5a.items[0];
const built = await readJson("public/r/living-type-01.json");
registryItemSchema.parse(built);
assert.equal(built.name, item.name);
assert.equal(item.type, "registry:block");
assert.equal(built.registryDependencies?.length ?? 0, 0);
assert.equal(built.css, undefined, "Living Type must not inject global CSS");
assert.equal(built.cssVars, undefined, "Living Type must not inject global tokens");
assert.equal(built.files.length, 12, "Living Type must include source, assets, docs and licences");
assert.deepEqual(built.dependencies, ["@paper-design/shaders-react@0.0.82"]);

const byName = new Map(built.files.map((file) => [path.basename(file.path), file]));
for (const required of [
  "living-type.tsx",
  "living-type.module.css",
  "living-type-font.css",
  "living-type-recipe.ts",
  "living-type-mask.ts",
  "living-type.recipe.example.json",
  "living-type.recipe.schema.json",
  "README.md",
  "THIRD_PARTY_NOTICES.md",
  "PAPER_SHADERS_LICENSE.txt",
  "PAPER_SHADERS_NOTICE.txt",
  "UNBOUNDED_OFL.txt",
]) {
  assert.ok(byName.has(required), `Missing Living Type install file: ${required}`);
}
for (const file of built.files) {
  assert.equal(file.content, await readFile(file.path, "utf8"), `${file.path} is stale`);
  assert.ok(file.target?.startsWith("components/living-type-01/"), `${file.path} has an unexpected target`);
  assert.equal(file.type, "registry:file");
}
const tsx = byName.get("living-type.tsx").content;
for (const specifier of [
  "react",
  "@paper-design/shaders-react",
  "./living-type-font.css",
  "./living-type.module.css",
  "./living-type-recipe",
  "./living-type-mask",
]) {
  assert.ok(tsx.includes(specifier), `Living Type TSX is missing ${specifier}`);
}
assert.ok(!/from\s+["'](?:next\/|@\/)/.test(tsx), "Living Type leaks a Nullworx/Next alias");
assert.ok(!/dangerouslySetInnerHTML|eval\(|new Function/.test(tsx), "Executable recipe path found");
const css = byName.get("living-type.module.css").content;
assert.ok(!/:global|:root|@import|@tailwind|@apply/.test(css), "Unscoped CSS found");
assert.ok(css.includes("prefers-reduced-motion"));
const fontCss = byName.get("living-type-font.css").content;
assert.ok(fontCss.includes("@font-face"), "Font CSS is missing its face");
assert.ok(fontCss.includes("data:font/woff2;base64,"), "Font asset was not embedded");
assert.ok(fontCss.includes("U+0020-007E"), "Font subset range is not declared");
assert.ok(!/@import|url\(["']https?:/.test(fontCss), "Font CSS must not fetch remotely");
const example = JSON.parse(byName.get("living-type.recipe.example.json").content);
const schema = JSON.parse(byName.get("living-type.recipe.schema.json").content);
assert.equal(example.schemaVersion, schema.properties.schemaVersion.const);
assert.equal(example.effect.id, "living-type-01");
assert.equal(
  byName.get("PAPER_SHADERS_NOTICE.txt").content.trim(),
  "Paper Shaders\nCopyright 2026 Paper\n\nPowered by Paper Shaders:\nhttps://shaders.paper.design",
);
assert.ok(byName.get("PAPER_SHADERS_LICENSE.txt").content.includes("Apache License"));
assert.ok(byName.get("UNBOUNDED_OFL.txt").content.includes("SIL OPEN FONT LICENSE"));
console.log("PASS living-type-01: 12 install files, pinned dependency, embedded font, portable imports, licences, example/schema");
console.log("PASS registry manifests: UI Forge remains 3 items; G5-A is 1 separate installable item");
