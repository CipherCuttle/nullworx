import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "evidence", "provenance");
const BASELINE = path.join(OUT_DIR, "source-baseline.json");
const CURRENT = path.join(OUT_DIR, "source-current.json");
const COMPARISON = path.join(OUT_DIR, "preservation.json");

const SOURCES = [
  {
    name: "ui-forge",
    path: "/home/swirky/DevHub/experiments/ui-forge",
    role: "Original UI Forge gallery and component shell",
  },
  {
    name: "ui-forge-flower-integration-01",
    path: "/home/swirky/DevHub/experiments/ui-forge-flower-integration-01",
    role: "Reviewed ASCII Waves Flower integration copy; direct source of the effect",
  },
  {
    name: "ascii-waves-react-01",
    path: "/home/swirky/DevHub/experiments/ascii-waves-react-01",
    role: "Standalone React ASCII Waves review build",
  },
  {
    name: "living-stencils-proof01",
    path: "/home/swirky/DevHub/experiments/living-stencils-proof01",
    role: "Living Stencils and Terminal Rain review build (not migrated)",
  },
];

const EXCLUDED_DIRS = new Set(["node_modules", ".next", "dist", ".git", ".turbo", ".cache", ".tmp-tests", "coverage"]);
const IGNORED_FILE_PATTERNS = [/\.tsbuildinfo$/];

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

async function listFiles(dir, base = dir, output = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) continue;
      await listFiles(path.join(dir, entry.name), base, output);
    } else if (entry.isFile()) {
      if (IGNORED_FILE_PATTERNS.some((pattern) => pattern.test(entry.name))) continue;
      output.push(path.relative(base, path.join(dir, entry.name)));
    }
  }
  return output.sort();
}

async function gitProbe(sourcePath) {
  try {
    const { stdout: head } = await execFileAsync("git", ["-C", sourcePath, "rev-parse", "HEAD"]);
    const { stdout: status } = await execFileAsync("git", ["-C", sourcePath, "status", "--short", "--branch"]);
    return {
      head: head.trim(),
      status: status.trim().split("\n").filter(Boolean),
    };
  } catch {
    return { head: null, status: null };
  }
}

async function fingerprint(source) {
  const files = await listFiles(source.path);
  const entries = [];
  for (const relative of files) {
    const absolute = path.join(source.path, relative);
    const info = await stat(absolute);
    const digest = sha256(await readFile(absolute));
    entries.push(`${relative}\0${info.size}\0${digest}\n`);
  }
  const treeHash = sha256(entries.join(""));
  const git = await gitProbe(source.path);
  return {
    ...source,
    exists: true,
    fileCount: files.length,
    treeSha256: treeHash,
    hashing: "sha256(join(sorted(relativePath + NUL + byteSize + NUL + fileSha256 + LF)))",
    exclusions: [...EXCLUDED_DIRS].sort(),
    gitHead: git.head,
    gitStatus: git.status,
    gitStatusCount: git.status?.length ?? 0,
  };
}

async function writeJson(file, data) {
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const now = new Date().toISOString();
  const sources = [];
  for (const source of SOURCES) {
    try {
      sources.push(await fingerprint(source));
    } catch (error) {
      sources.push({
        ...source,
        exists: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const current = {
    generatedAt: now,
    method: "Read-only source-tree fingerprint. Original experiment directories are never written by this script.",
    sources,
  };

  const baselineExists = await stat(BASELINE).then(() => true).catch(() => false);
  const writeBaseline = process.argv.includes("--write-baseline");

  if (!baselineExists || writeBaseline) {
    await writeJson(BASELINE, current);
    console.log(`Baseline written: ${path.relative(ROOT, BASELINE)}`);
  }

  await writeJson(CURRENT, current);

  const baseline = JSON.parse(await readFile(BASELINE, "utf8"));
  const baselineByPath = new Map(baseline.sources.map((source) => [source.path, source]));
  const comparisons = current.sources.map((source) => {
    const before = baselineByPath.get(source.path);
    const unchanged =
      Boolean(before) &&
      before.exists === source.exists &&
      before.fileCount === source.fileCount &&
      before.treeSha256 === source.treeSha256 &&
      JSON.stringify(before.gitStatus) === JSON.stringify(source.gitStatus) &&
      before.gitHead === source.gitHead;
    return {
      name: source.name,
      path: source.path,
      before: before ? { fileCount: before.fileCount, treeSha256: before.treeSha256, gitHead: before.gitHead } : null,
      after: { fileCount: source.fileCount, treeSha256: source.treeSha256, gitHead: source.gitHead },
      unchanged,
    };
  });

  const preservation = {
    generatedAt: now,
    baselineGeneratedAt: baseline.generatedAt,
    comparedSources: comparisons.length,
    unchangedSources: comparisons.filter((item) => item.unchanged).length,
    comparisons,
  };
  await writeJson(COMPARISON, preservation);

  for (const comparison of comparisons) {
    console.log(`${comparison.unchanged ? "UNCHANGED" : "CHANGED"}  ${comparison.name}  ${comparison.after.fileCount} files  ${comparison.after.treeSha256}`);
  }

  if (comparisons.some((item) => !item.unchanged)) {
    console.error("Source preservation comparison failed. Do not clean or reset the originals.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
