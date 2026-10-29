#!/usr/bin/env node
/**
 * Runs the preserved UI Forge gallery callback against the production server,
 * writes the real clipboard payloads as a clean-consumer fixture, and records
 * the 43 gallery assertions.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import verifyGallery from "./browser-gallery.mjs";

const ORIGIN = process.env.ORIGIN ?? "http://127.0.0.1:3100";
const EVIDENCE = path.resolve(process.env.EVIDENCE_DIR ?? "evidence/g1");
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await mkdir(path.join(EVIDENCE, "screenshots"), { recursive: true });
  const screenshot = page.screenshot.bind(page);
  page.screenshot = async (options = {}) => {
    if (typeof options.path === "string") {
      options = { ...options, path: path.join(EVIDENCE, "screenshots", path.basename(options.path)) };
    }
    return screenshot(options);
  };
  const result = await verifyGallery(page);

  const copiedRoot = path.join(EVIDENCE, "copied");
  await mkdir(copiedRoot, { recursive: true });
  for (const entry of result.copied) {
    const dir = path.join(copiedRoot, entry.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "demo.tsx"), entry.usage);
    for (const file of entry.files) {
      await writeFile(path.join(dir, file.name), file.content);
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    origin: ORIGIN,
    browser: result.browser,
    checks: result.checks,
    failures: result.failures,
    passed: result.checks.length,
    failed: result.failures.length,
    copied: result.copied.map((entry) => ({
      slug: entry.slug,
      files: entry.files.map((file) => file.name),
      usageBytes: entry.usage.length,
    })),
    runtimeErrors: result.runtimeErrors,
    failedRequests: result.failedRequests,
  };
  await writeFile(path.join(EVIDENCE, "gallery-results.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(`${summary.passed}/${summary.passed + summary.failed} gallery assertions passed.`);
  console.log(`Clipboard fixtures: ${copiedRoot}`);
  if (summary.failed > 0 || result.runtimeErrors.length > 0 || result.failedRequests.length > 0) {
    console.error("Gallery callback failures:", result.failures);
    console.error("Runtime errors:", result.runtimeErrors);
    console.error("Failed requests:", result.failedRequests);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
