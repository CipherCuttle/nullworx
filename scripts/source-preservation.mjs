#!/usr/bin/env node
/**
 * Records a reproducible content fingerprint for preserved source roots.
 * Read-only: never writes inside a source root.
 *
 * Usage: node scripts/source-preservation.mjs --output evidence/g0/source-preservation-baseline.json
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const HOME = process.env.HOME;
const EXCLUDED_DIRS = new Set([
  "node_modules", ".next", "dist", ".git", ".turbo", ".cache", ".tmp-tests",
  "coverage", "test-results", "playwright-report", "blob-report",
]);
const EXCLUDED_SUFFIXES = [".tsbuildinfo"];

const ROOTS = [
  { id: "ui-forge", path: join(HOME, "DevHub/experiments/ui-forge") },
  { id: "ui-forge-flower-integration-01", path: join(HOME, "DevHub/experiments/ui-forge-flower-integration-01") },
  { id: "ascii-waves-react-01", path: join(HOME, "DevHub/experiments/ascii-waves-react-01") },
  { id: "ui-forge-expansion-02", path: join(HOME, "DevHub/experiments/ui-forge-expansion-02") },
  { id: "ui-forge-pearl-caustics-proof02", path: join(HOME, "DevHub/experiments/ui-forge-pearl-caustics-proof02") },
  { id: "living-stencils-proof01", path: join(HOME, "DevHub/experiments/living-stencils-proof01") },
  { id: "nullworx-g3a", path: join(HOME, "Documents/deepseek-harness/default-workspace/nullworx-g3a") },
  { id: "nullworx-branded-baseline", path: join(HOME, "DevHub/experiments/nullworx-site-preview") },
];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function walk(root, current = root, files = []) {
  for (const entry of readdirSync(current, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      walk(root, join(current, entry.name), files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (EXCLUDED_SUFFIXES.some((suffix) => entry.name.endsWith(suffix))) continue;
    const absolute = join(current, entry.name);
    const rel = relative(root, absolute).split("\\").join("/");
    const bytes = readFileSync(absolute);
    files.push({ path: rel, bytes: bytes.length, sha256: sha256(bytes) });
  }
  return files;
}

function treeDigest(files) {
  const hash = createHash("sha256");
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    hash.update(file.path);
    hash.update("\0");
    hash.update(String(file.bytes));
    hash.update("\0");
    hash.update(file.sha256);
    hash.update("\n");
  }
  return hash.digest("hex");
}

function gitInfo(root) {
  try {
    const git = (...args) => execFileSync("git", ["-C", root, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return {
      head: git("rev-parse", "HEAD"),
      branch: git("rev-parse", "--abbrev-ref", "HEAD"),
      dirtyEntries: git("status", "--porcelain").split("\n").filter(Boolean).length,
    };
  } catch {
    return { head: null, branch: null, dirtyEntries: null };
  }
}

const outputFlag = process.argv.indexOf("--output");
const output = outputFlag !== -1 ? process.argv[outputFlag + 1] : "evidence/g0/source-preservation.json";
const roots = ROOTS.map((root) => {
  const files = walk(root.path);
  return {
    id: root.id,
    path: root.path,
    fileCount: files.length,
    treeSha256: treeDigest(files),
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    git: gitInfo(root.path),
  };
});
const document = {
  schema: "nullworx-source-preservation/1",
  generatedAt: new Date().toISOString(),
  method: "sha256(join(sorted(relativePath + NUL + byteSize + NUL + fileSha256 + LF)))",
  excluded: [...EXCLUDED_DIRS].sort(),
  roots,
};
mkdirSync(dirname(resolve(output)), { recursive: true });
writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`);
console.log(JSON.stringify({ output, roots: roots.map(({ id, fileCount, treeSha256, git }) => ({ id, fileCount, treeSha256, git })) }, null, 2));
