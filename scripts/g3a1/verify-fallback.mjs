#!/usr/bin/env node
/**
 * Explicit no-WebGL2 fallback acceptance.
 *
 * Launches the same production build with WebGL disabled. The Paper material
 * must not mount, must not be replaced by a static gradient or any other
 * effect, and must show the lab's explicit fallback. HoloType (DOM/CSS) must
 * still work, and the canonical mask must still be present.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, firefox } from "playwright-core";

const ORIGIN = process.env.ORIGIN ?? "http://127.0.0.1:3100";
const EVIDENCE = path.resolve(process.env.EVIDENCE_DIR ?? "evidence/g3a1/no-webgl2");
const SHOTS = path.join(EVIDENCE, "screenshots");
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";

const results = [];
const record = (check, pass, detail) => {
  results.push({ check, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${check}${detail === undefined ? "" : ` — ${detail}`}`);
};

async function run() {
  const engines = [];
  for (const [name, launcher, options] of [
    [
      "chromium-no-webgl",
      chromium,
      {
        executablePath: CHROME,
        headless: true,
        args: ["--disable-webgl", "--disable-webgl2", "--disable-3d-apis", "--use-gl=disabled"],
      },
    ],
    [
      "firefox-no-webgl",
      firefox,
      {
        headless: true,
        firefoxUserPrefs: { "webgl.disabled": true, "webgl.force-disabled": true },
      },
    ],
  ]) {
    const engineDir = path.join(EVIDENCE, name);
    await mkdir(path.join(SHOTS, name), { recursive: true });
    await mkdir(engineDir, { recursive: true });
    let browser;
    try {
      browser = await launcher.launch({ ...options, timeout: 60000 });
    } catch (error) {
      record(`${name}: browser launches`, false, String(error).slice(0, 300));
      continue;
    }
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    const pageErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error?.stack ?? String(error)));

    await page.goto(`${ORIGIN}/labs/composition`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForSelector('[data-testid="composition-lab"]');

    const availability = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      return {
        webgl2: Boolean(canvas.getContext("webgl2")),
        webgl1: Boolean(canvas.getContext("webgl")),
      };
    });
    record(`${name}: WebGL2 is actually unavailable`, availability.webgl2 === false, JSON.stringify(availability));

    // HoloType must still render without WebGL.
    await page.locator('[data-testid="preset-a"]').click();
    await page.waitForTimeout(900);
    const holo = await page.evaluate(() => ({
      holotype: document.querySelectorAll("[data-holo-glyph]").length,
      fallback: Boolean(document.querySelector('[data-testid="webgl-fallback"]')),
      canvases: document.querySelectorAll('[data-surface="paper"] canvas').length,
    }));
    record(`${name}: HoloType still renders without WebGL`, holo.holotype > 0 && !holo.fallback, JSON.stringify(holo));
    await page.screenshot({ path: path.join(SHOTS, name, "a-holotype.png") });

    // Paper must show the explicit fallback and mount nothing.
    await page.locator('[data-testid="preset-b"]').click();
    await page.waitForTimeout(1200);
    const paper = await page.evaluate(() => {
      const surface = document.querySelector('[data-surface="paper"]');
      const fallback = document.querySelector('[data-testid="webgl-fallback"]');
      return {
        hasSurface: Boolean(surface),
        webglState: surface?.getAttribute("data-webgl") ?? null,
        fallbackText: fallback?.textContent?.trim() ?? null,
        canvasCount: document.querySelectorAll("canvas").length,
        paperCanvas: document.querySelectorAll('[data-surface="paper"] canvas').length,
        maskPresent: Boolean(document.querySelector('[data-testid="mask-reference"]')),
        maskSource: document.querySelector('[data-testid="mask-source"]')?.textContent ?? null,
        gradientReplacement: document.querySelectorAll("[data-paper-shader]").length,
        stageShot: Boolean(document.querySelector('[data-testid="composition-stage-inner"]')),
      };
    });
    // The fallback replaces the Paper surface element entirely, so the
    // assertion is on the explicit fallback text and the absence of material,
    // not on a data-surface attribute that only exists for a mounted surface.
    record(
      `${name}: explicit fallback is shown`,
      /WebGL2 is unavailable/.test(paper.fallbackText ?? "") && paper.canvasCount === 0,
      JSON.stringify(paper),
    );
    record(`${name}: no canvas is mounted for Paper`, paper.paperCanvas === 0 && paper.gradientReplacement === 0, JSON.stringify({ canvas: paper.paperCanvas, shader: paper.gradientReplacement }));
    record(`${name}: mask is not substituted or removed`, paper.maskPresent && /svg|canvas/.test(paper.maskSource ?? ""), JSON.stringify({ mask: paper.maskPresent, source: paper.maskSource }));
    record(`${name}: stage is still present`, paper.stageShot === true);
    record(`${name}: no console errors`, errors.length === 0, JSON.stringify(errors.slice(0, 3)));
    record(`${name}: no page errors`, pageErrors.length === 0, JSON.stringify(pageErrors.slice(0, 2)));
    await page.screenshot({ path: path.join(SHOTS, name, "b-fallback.png") });
    await page.locator('[data-testid="composition-stage-inner"]').screenshot({ path: path.join(SHOTS, name, "b-fallback-stage.png") });

    // Wordmark mask must fail closed too, not draw unclipped material.
    await page.locator('[data-testid="preset-d"]').click();
    await page.waitForTimeout(1000);
    const wordmark = await page.evaluate(() => ({
      fallback: Boolean(document.querySelector('[data-testid="webgl-fallback"]')),
      canvases: document.querySelectorAll('[data-surface="paper"] canvas').length,
      maskSource: document.querySelector('[data-testid="mask-source"]')?.textContent ?? null,
    }));
    record(`${name}: wordmark fallback also fails closed`, wordmark.fallback && wordmark.canvases === 0, JSON.stringify(wordmark));
    record(`${name}: wordmark mask still rasterized`, /canvas/.test(wordmark.maskSource ?? ""), wordmark.maskSource ?? "missing");

    const engineResult = {
      engine: name,
      browserVersion: browser.version(),
      availability,
      checks: results.filter((entry) => entry.check.startsWith(`${name}:`)),
    };
    await writeFile(path.join(engineDir, "results.json"), JSON.stringify(engineResult, null, 2) + "\n");
    engines.push(engineResult);
    await browser.close();
  }
  await writeFile(path.join(EVIDENCE, "summary.json"), JSON.stringify({ generatedAt: new Date().toISOString(), engines, results }, null, 2) + "\n");
  const failed = results.filter((entry) => !entry.pass).length;
  console.log(`\n${results.length - failed}/${results.length} fallback checks passed.`);
  if (failed > 0) process.exitCode = 1;
}

await mkdir(SHOTS, { recursive: true });
await run();
