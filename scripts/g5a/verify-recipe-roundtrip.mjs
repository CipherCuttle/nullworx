#!/usr/bin/env node
/**
 * Gate 4 proof against the local product demo and the noindex recipe-proof
 * route. The recipe is saved from the live editor, parsed by the installed
 * contract, mounted paused, exported, reloaded, and compared as a still.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { channelDelta, decodePng, pixelAt } from "../lib/png.mjs";

const ORIGIN = process.env.G5A_ORIGIN ?? "http://127.0.0.1:3102";
const EVIDENCE = path.resolve(process.env.EVIDENCE_DIR ?? "evidence/g5a/recipe");
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const STORAGE_KEY = "g5a-recipe-proof";
await import("node:fs/promises").then((fs) => fs.mkdir(EVIDENCE, { recursive: true }));

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--use-gl=angle", "--use-angle=gl", "--ignore-gpu-blocklist", "--disable-background-timer-throttling"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
const failed = [];
page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
page.on("pageerror", (error) => errors.push(String(error)));
page.on("requestfailed", (request) => failed.push({ url: request.url(), error: request.failure()?.errorText }));

try {
  await page.goto(`${ORIGIN}/living-type`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("[data-living-type]")?.getAttribute("data-renderer") === "shader");
  await page.getByTestId("text-input").fill("KILN/07");
  await page.getByTestId("preset-kiln").click();
  await page.getByTestId("weight").selectOption("800");
  if (await page.locator("[data-living-type]").getAttribute("data-paused") !== "true") {
    await page.getByTestId("pause-toggle").click();
  }
  await page.waitForFunction(() => {
    const root = document.querySelector("[data-living-type]");
    return root?.getAttribute("data-text") === "KILN/07" && root?.getAttribute("data-mask-state") === "ready" && root?.getAttribute("data-paused") === "true";
  }, { timeout: 10000 });
  const recipeJson = await page.getByTestId("recipe-json").inputValue();
  await writeFile(path.join(EVIDENCE, "recipe.json"), recipeJson);
  const recipe = JSON.parse(recipeJson);
  await page.evaluate(({ key, value }) => window.localStorage.setItem(key, value), { key: STORAGE_KEY, value: recipeJson });

  async function mountProof() {
    await page.goto(`${ORIGIN}/living-type/recipe-proof`, { waitUntil: "networkidle" });
    await page.waitForFunction(() => {
      const root = document.querySelector("[data-living-type]");
      return root?.getAttribute("data-renderer") === "shader" && root?.getAttribute("data-mask-state") === "ready";
    }, { timeout: 15000 });
    await page.waitForTimeout(500);
    const attrs = await page.evaluate(() => {
      const root = document.querySelector("[data-living-type]");
      const rect = root.getBoundingClientRect();
      return {
        text: root.dataset.text,
        preset: root.dataset.preset,
        paused: root.dataset.paused,
        reduced: root.dataset.reduced,
        maskKey: root.dataset.maskKey,
        maskWidth: root.dataset.maskWidth,
        maskHeight: root.dataset.maskHeight,
        renderer: root.dataset.renderer,
        rect: { width: rect.width, height: rect.height },
      };
    });
    return attrs;
  }

  const attrsA = await mountProof();
  const shotA = path.join(EVIDENCE, "paused-a.png");
  await page.locator("[data-living-type]").screenshot({ path: shotA });
  const attrsB = await mountProof();
  const shotB = path.join(EVIDENCE, "paused-b.png");
  await page.locator("[data-living-type]").screenshot({ path: shotB });

  const a = decodePng(await readFile(shotA));
  const b = decodePng(await readFile(shotB));
  let max = 0;
  let changed = 0;
  for (let y = 0; y < a.height; y += 1) {
    for (let x = 0; x < a.width; x += 1) {
      const delta = channelDelta(pixelAt(a, x, y), pixelAt(b, x, y));
      if (delta > max) max = delta;
      if (delta > 0) changed += 1;
    }
  }
  const settingsEqual = JSON.stringify(attrsA) === JSON.stringify(attrsB);
  const visualEquivalent = max <= 2 && changed < a.width * a.height * 0.001;
  const result = {
    generatedAt: new Date().toISOString(),
    origin: ORIGIN,
    recipe,
    storageKey: STORAGE_KEY,
    mountA: attrsA,
    mountB: attrsB,
    settingsEqual,
    visual: { width: a.width, height: a.height, maxChannelDelta: max, changedPixels: changed, totalPixels: a.width * a.height, visualEquivalent },
    errors,
    failedRequests: failed,
    pass: settingsEqual && visualEquivalent && errors.length === 0 && failed.length === 0,
    note: "The recipe has no time value. Both mounts are paused at frame 0. This proves configuration and paused-still equivalence, not frame-perfect animation replay.",
  };
  await writeFile(path.join(EVIDENCE, "roundtrip.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify({ pass: result.pass, settingsEqual, visual: result.visual, errors, failed }, null, 2));
  if (!result.pass) process.exitCode = 1;
} finally {
  await browser.close();
}
