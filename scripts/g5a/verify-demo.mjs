#!/usr/bin/env node
/** Customer-demo interactions: colour, save/download, import, pause, reduced motion, invalid text. */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { channelDelta, decodePng, pixelAt } from "../lib/png.mjs";

const ORIGIN = process.env.G5A_ORIGIN ?? "http://127.0.0.1:3102";
const EVIDENCE = path.resolve(process.env.EVIDENCE_DIR ?? "evidence/g5a/demo");
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
await mkdir(EVIDENCE, { recursive: true });
const checks = [];
const failures = [];
const check = (name, condition, detail = "") => (condition ? checks.push(name) : failures.push({ name, detail }));

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--use-gl=angle", "--use-angle=gl", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true });
const errors = [];
const failed = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
page.on("requestfailed", (request) => failed.push({ url: request.url(), error: request.failure()?.errorText }));

try {
  await page.goto(`${ORIGIN}/living-type`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("[data-living-type]")?.getAttribute("data-renderer") === "shader");
  if (await page.locator("[data-living-type]").getAttribute("data-paused") !== "true") await page.getByTestId("pause-toggle").click();
  await page.waitForTimeout(300);
  const initial = await page.evaluate(() => {
    const root = document.querySelector("[data-living-type]");
    return { text: root.dataset.text, preset: root.dataset.preset, mask: root.dataset.maskKey, paused: root.dataset.paused };
  });
  const aria = await page.locator("[data-living-type]").ariaSnapshot();
  check("demo: accessible wordmark appears once", (aria.match(/NULLWORX/g) ?? []).length === 1, aria);
  const canvasMark = await page.evaluate(() => { const canvas = document.querySelector("canvas"); if (canvas) canvas.dataset.demo = "same"; return canvas?.dataset.demo; });
  const beforeColor = path.join(EVIDENCE, "colour-before.png");
  await page.locator("[data-living-type]").screenshot({ path: beforeColor });

  // Colour change must not rebuild the mask or remount the material.
  await page.evaluate(() => {
    const input = document.querySelector('input[aria-label="Shader colour 1"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    setter.call(input, "#ff3b00");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await page.waitForTimeout(400);
  const colored = await page.evaluate(() => {
    const root = document.querySelector("[data-living-type]");
    return { mask: root.dataset.maskKey, canvas: document.querySelector("canvas")?.dataset.demo, preset: root.dataset.preset };
  });
  check("demo: colour edit keeps the mask identity", colored.mask === initial.mask, JSON.stringify({ initial, colored }));
  check("demo: colour edit keeps the material mounted", colored.canvas === canvasMark, JSON.stringify(colored));
  const afterColor = path.join(EVIDENCE, "colour-edited.png");
  await page.locator("[data-living-type]").screenshot({ path: afterColor });
  const beforeImage = decodePng(await readFile(beforeColor));
  const afterImage = decodePng(await readFile(afterColor));
  let colourDelta = 0;
  for (let y = 0; y < beforeImage.height; y += 4) for (let x = 0; x < beforeImage.width; x += 4) colourDelta = Math.max(colourDelta, channelDelta(pixelAt(beforeImage, x, y), pixelAt(afterImage, x, y)));
  check("demo: colour edit changes the visual", colourDelta > 8, `max channel delta ${colourDelta}`);

  // Download the current validated recipe.
  const downloadPromise = page.waitForEvent("download", { timeout: 5000 });
  await page.getByTestId("download-recipe").click();
  const download = await downloadPromise;
  const saved = path.join(EVIDENCE, "downloaded-recipe.json");
  await download.saveAs(saved);
  const recipe = JSON.parse(await readFile(saved, "utf8"));
  check("demo: downloads a JSON recipe", download.suggestedFilename().endsWith(".json"), download.suggestedFilename());
  check("demo: downloaded recipe contains the colour edit and schema", recipe.schemaVersion === "1.0.0" && recipe.config.colors[0].toLowerCase() === "#ff3b00" && recipe.config.playback.paused === true, JSON.stringify({ schema: recipe.schemaVersion, colors: recipe.config.colors, paused: recipe.config.playback.paused }));

  // Import a modified recipe.
  const imported = { ...recipe, id: "imported-living-type", title: "Imported proof", config: { ...recipe.config, text: "IMPORTED" } };
  await page.getByTestId("import-json").fill(JSON.stringify(imported));
  await page.getByTestId("load-recipe").click();
  await page.waitForFunction(() => document.querySelector("[data-living-type]")?.getAttribute("data-text") === "IMPORTED" && document.querySelector("[data-living-type]")?.getAttribute("data-mask-state") === "ready", { timeout: 10000 });
  const importedState = await page.evaluate(() => {
    const root = document.querySelector("[data-living-type]");
    return { text: root.dataset.text, paused: root.dataset.paused, recipe: document.querySelector('[data-testid="recipe-json"]').value.includes('"imported-living-type"') };
  });
  check("demo: imported recipe restores text and paused playback", importedState.text === "IMPORTED" && importedState.paused === "true" && importedState.recipe, JSON.stringify(importedState));

  // Invalid text is rejected without silently changing the preview.
  await page.getByTestId("text-input").fill("NULLWÖRX");
  await page.waitForTimeout(150);
  const invalid = await page.evaluate(() => ({
    text: document.querySelector("[data-living-type]")?.getAttribute("data-text"),
    notice: document.querySelector('[data-testid="notice"]')?.textContent ?? "",
  }));
  check("demo: unsupported unicode is rejected with a clear notice", invalid.text === "IMPORTED" && /Supported characters|Unicode|last valid/i.test(invalid.notice), JSON.stringify(invalid));
  await page.getByTestId("text-input").fill("IMPORTED");
  await page.waitForTimeout(150);

  // Force reduced motion and prove two stills are identical.
  await page.getByTestId("reduced-motion").selectOption("force");
  await page.waitForFunction(() => document.querySelector("[data-living-type]")?.getAttribute("data-reduced") === "true", { timeout: 5000 });
  await page.waitForTimeout(250);
  const stillA = path.join(EVIDENCE, "reduced-a.png");
  const stillB = path.join(EVIDENCE, "reduced-b.png");
  await page.locator("[data-living-type]").screenshot({ path: stillA });
  await page.waitForTimeout(600);
  await page.locator("[data-living-type]").screenshot({ path: stillB });
  const a = decodePng(await readFile(stillA));
  const b = decodePng(await readFile(stillB));
  let max = 0;
  for (let y = 0; y < a.height; y += 2) for (let x = 0; x < a.width; x += 2) max = Math.max(max, channelDelta(pixelAt(a, x, y), pixelAt(b, x, y)));
  check("demo: forced reduced motion is a stable still", max <= 1, `max channel delta ${max}`);

  // Reset to the default specimen.
  await page.getByTestId("reset").click();
  await page.waitForFunction(() => document.querySelector("[data-living-type]")?.getAttribute("data-text") === "NULLWORX" && document.querySelector("[data-living-type]")?.getAttribute("data-mask-state") === "ready", { timeout: 10000 });
  check("demo: reset restores NULLWORX / Night Bloom", (await page.locator("[data-living-type]").getAttribute("data-preset")) === "night-bloom");
  await page.screenshot({ path: path.join(EVIDENCE, "demo-final.png"), fullPage: true });

  check("demo: no console errors", errors.length === 0, JSON.stringify(errors));
  check("demo: no failed requests", failed.length === 0, JSON.stringify(failed));
} finally {
  await browser.close();
}

const summary = { generatedAt: new Date().toISOString(), checks: checks.length, failures: failures.length, passed: failures.length === 0, failureDetails: failures, errors, failedRequests: failed };
await writeFile(path.join(EVIDENCE, "demo.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
if (!summary.passed) process.exitCode = 1;
