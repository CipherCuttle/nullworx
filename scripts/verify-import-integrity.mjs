#!/usr/bin/env node
/** Compares copied, preserved source files with their original source roots. */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, relative } from "node:path";

const HOME = process.env.HOME;
const H = (buffer) => createHash("sha256").update(buffer).digest("hex");
function files(root) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.isFile()) out.push({ path: relative(root, abs).split("\\").join("/"), sha256: H(readFileSync(abs)), bytes: statSync(abs).size });
    }
  };
  walk(root);
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

const groups = [
  { id: "holotype", dest: "experiments/holotype", src: join(HOME, "DevHub/experiments/ui-forge-expansion-02/experiments/holotype") },
  { id: "crt-material-lab", dest: "experiments/crt-material-lab", src: join(HOME, "DevHub/experiments/ui-forge-expansion-02/experiments/crt-material-lab") },
  { id: "pearl-caustics", dest: "experiments/pearl-caustics", src: join(HOME, "DevHub/experiments/ui-forge-pearl-caustics-proof02/src/pearl-caustics") },
  { id: "ui-forge-primitives", dest: "registry/new-york", src: join(HOME, "Documents/deepseek-harness/default-workspace/nullworx-g3a/registry/new-york") },
  {
    id: "terminal-rain",
    dest: "experiments/living-stencils",
    src: join(HOME, "DevHub/experiments/living-stencils-proof01"),
    only: [
      "src/materials/TerminalRain.tsx",
      "src/materials/TerminalRain.module.css",
      "src/materials/rainEngine.ts",
      "src/compositing/ascii.ts",
    ],
  },
  {
    id: "ascii-waves",
    dest: "components/effects/ascii-waves",
    src: join(HOME, "DevHub/experiments/ui-forge-flower-integration-01/registry/new-york/ascii-waves"),
    only: ["ascii-waves.tsx", "ascii-waves.module.css", "renderer.ts", "glyphAtlas.ts", "presets.ts"],
  },
  {
    id: "third-party-notices",
    dest: "third_party",
    src: join(HOME, "Documents/deepseek-harness/default-workspace/nullworx-g3a/third_party"),
  },
];

const results = groups.map((group) => {
  const srcFiles = new Map(files(group.src).map((file) => [file.path, file]));
  const destFiles = group.only
    ? group.only.map((path) => {
        const abs = join(group.dest, path);
        return { path, sha256: H(readFileSync(abs)), bytes: statSync(abs).size };
      })
    : files(group.dest);
  const matches = [];
  const mismatches = [];
  for (const file of destFiles) {
    const source = srcFiles.get(file.path);
    if (!source) {
      mismatches.push({ path: file.path, reason: "not present in source" });
      continue;
    }
    if (source.sha256 !== file.sha256) mismatches.push({ path: file.path, reason: "hash differs", source: source.sha256, dest: file.sha256 });
    else matches.push(file.path);
  }
  return { id: group.id, source: group.src, destination: group.dest, fileCount: destFiles.length, matches: matches.length, mismatches };
});

const document = { generatedAt: new Date().toISOString(), method: "sha256(file bytes)", groups: results };
mkdirSync("evidence/g2", { recursive: true });
writeFileSync("evidence/g2/import-integrity.json", `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify(results.map(({ id, fileCount, matches, mismatches }) => ({ id, fileCount, matches, mismatches })), null, 2));
if (results.some((group) => group.mismatches.length > 0)) process.exitCode = 1;
