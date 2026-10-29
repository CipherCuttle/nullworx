import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { registrySchema, registryItemSchema } from "shadcn/schema";

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const manifest = await readJson("registry.json");
registrySchema.parse(manifest);
assert.deepEqual(manifest.items.map((item) => item.name), ["command-button", "signal-card", "reveal-heading"]);

if (process.argv.includes("--sync")) {
  await writeFile("public/r/registry.json", JSON.stringify(manifest, null, 2) + "\n");
}
assert.deepEqual(await readJson("public/r/registry.json"), manifest, "Public registry index is stale");

for (const item of manifest.items) {
  const built = await readJson(`public/r/${item.name}.json`);
  registryItemSchema.parse(built);
  assert.equal(built.name, item.name);
  assert.equal(built.files.length, 2, "Each item must include its TSX and CSS Module");
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
console.log("PASS registry index: exactly 3 installable items");
