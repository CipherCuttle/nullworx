#!/usr/bin/env node
/**
 * Headed GPU comparison on the owner's RTX 4060 / 143 Hz display.
 *
 * Baseline: G3-A.1 preset D at its natural 738x149 stage.
 * Exported: the shadcn-installed Living Type 01, D-equivalent recipe, 738x148.
 *
 * Frame intervals are rAF cadence, not GPU frame time and not a universal FPS
 * claim. Both pages are measured in the same headed browser and viewport.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const EVIDENCE = path.resolve(process.env.EVIDENCE_DIR ?? "evidence/g5a/performance");
const ROUNDS = Number(process.env.ROUNDS ?? 3);
const SAMPLE_MS = Number(process.env.SAMPLE_MS ?? 5000);
const BASELINE = process.env.BASELINE_ORIGIN ?? "http://127.0.0.1:3300";
const EXPORTED = process.env.EXPORTED_ORIGIN ?? "http://127.0.0.1:3201";
await mkdir(EVIDENCE, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: false,
  args: [
    "--use-gl=angle",
    "--use-angle=gl",
    "--ignore-gpu-blocklist",
    "--disable-gpu-driver-bug-workarounds",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--window-size=1440,900",
  ],
  env: { ...process.env, DISPLAY: process.env.DISPLAY ?? ":0" },
});

function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
  return {
    samples: sorted.length,
    medianMs: Number(at(50).toFixed(2)),
    p95Ms: Number(at(95).toFixed(2)),
    p99Ms: Number(at(99).toFixed(2)),
    maxMs: Number((sorted[sorted.length - 1] ?? 0).toFixed(2)),
    over33ms: sorted.filter((value) => value > 33).length,
    over50ms: sorted.filter((value) => value > 50).length,
    over100ms: sorted.filter((value) => value > 100).length,
    averageFps: Number((values.length / (values.reduce((sum, value) => sum + value, 0) / 1000)).toFixed(1)),
    impliedHz: Number((1000 / Math.max(0.01, at(50))).toFixed(1)),
  };
}

async function sample(page, ms) {
  return page.evaluate((duration) => new Promise((resolve) => {
    const deltas = [];
    let last = performance.now();
    const start = last;
    function tick(now) {
      deltas.push(now - last);
      last = now;
      if (now - start < duration) requestAnimationFrame(tick);
      else resolve(deltas);
    }
    requestAnimationFrame(tick);
  }), ms);
}

async function gpuInfo(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const gl = canvas?.getContext("webgl2");
    if (!gl) return { webgl2: false };
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      webgl2: true,
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      version: gl.getParameter(gl.VERSION),
    };
  });
}

const baselinePage = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const exportedPage = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
for (const page of [baselinePage, exportedPage]) {
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("pageerror", (error) => errors.push(String(error)));
}

try {
  await baselinePage.goto(`${BASELINE}/labs/composition`, { waitUntil: "networkidle" });
  await baselinePage.getByTestId("preset-d").click();
  await baselinePage.waitForFunction(() => {
    const root = document.querySelector('[data-testid="composition-lab"]');
    const source = document.querySelector('[data-testid="mask-source"]');
    return root?.getAttribute("data-recipe") === "d-wordmark-paper" && source?.textContent?.includes("canvas");
  }, { timeout: 20000 });
  await baselinePage.locator('[data-testid="composition-stage"]').scrollIntoViewIfNeeded();
  await baselinePage.waitForTimeout(1800);

  await exportedPage.goto(`${EXPORTED}/measure`, { waitUntil: "networkidle" });
  await exportedPage.waitForFunction(() => {
    const root = document.querySelector("[data-living-type]");
    return root?.getAttribute("data-renderer") === "shader" && root?.getAttribute("data-mask-state") === "ready";
  }, { timeout: 20000 });
  await exportedPage.waitForTimeout(1800);

  const baselineBox = await baselinePage.locator('[data-testid="composition-stage"]').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  const exportedBox = await exportedPage.locator("[data-living-type]").evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
  const baselineGpu = await gpuInfo(baselinePage);
  const exportedGpu = await gpuInfo(exportedPage);

  await baselinePage.locator('[data-testid="composition-stage"]').screenshot({ path: path.join(EVIDENCE, "baseline-d.png") });
  await exportedPage.locator("[data-living-type]").screenshot({ path: path.join(EVIDENCE, "exported-d-equivalent.png") });

  const rounds = [];
  for (let round = 0; round < ROUNDS; round += 1) {
    await baselinePage.bringToFront();
    await baselinePage.waitForTimeout(1000);
    const baselineFrames = await sample(baselinePage, SAMPLE_MS);
    await exportedPage.bringToFront();
    await exportedPage.waitForTimeout(1000);
    const exportedFrames = await sample(exportedPage, SAMPLE_MS);
    rounds.push({
      round,
      baseline: stats(baselineFrames),
      exported: stats(exportedFrames),
    });
  }

  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  const baselineMedian = median(rounds.map((round) => round.baseline.medianMs));
  const exportedMedian = median(rounds.map((round) => round.exported.medianMs));
  const regressionPct = Number((((exportedMedian - baselineMedian) / baselineMedian) * 100).toFixed(2));
  const baselineLong = rounds.reduce((sum, round) => sum + round.baseline.over50ms, 0);
  const exportedLong = rounds.reduce((sum, round) => sum + round.exported.over50ms, 0);
  const baselineSustained = rounds.some((round) => round.baseline.over50ms > round.baseline.samples * 0.02);
  const exportedSustained = rounds.some((round) => round.exported.over50ms > round.exported.samples * 0.02);

  const result = {
    generatedAt: new Date().toISOString(),
    method: `Headed Chromium on DISPLAY ${process.env.DISPLAY ?? ":0"}, same browser, 1440x900 viewport, DPR1, alternating rounds, 1s warmup + ${SAMPLE_MS}ms rAF cadence. rAF cadence is not GPU frame time.`,
    browser: await browser.version(),
    baseline: {
      origin: `${BASELINE}/labs/composition`,
      recipe: "d-wordmark-paper",
      stage: baselineBox,
      gpu: baselineGpu,
      rounds: rounds.map((round) => round.baseline),
      medianOfMediansMs: baselineMedian,
      over50Total: baselineLong,
      sustainedOver50: baselineSustained,
    },
    exported: {
      origin: `${EXPORTED}/measure`,
      recipe: "D-equivalent recipe through the shadcn-installed Living Type 01",
      stage: exportedBox,
      gpu: exportedGpu,
      rounds: rounds.map((round) => round.exported),
      medianOfMediansMs: exportedMedian,
      over50Total: exportedLong,
      sustainedOver50: exportedSustained,
    },
    comparison: {
      medianRegressionPct: regressionPct,
      over25PctMedianRegression: regressionPct > 25,
      newSustainedLongFrames: !baselineSustained && exportedSustained,
      note: "A negative regression means the exported composition had a lower median frame interval. No display-refresh or FPS claim is made.",
    },
    errors,
    pass: regressionPct <= 25 && !(exportedSustained && !baselineSustained) && errors.length === 0,
  };
  await writeFile(path.join(EVIDENCE, "performance.json"), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result, null, 2));
  if (!result.pass) process.exitCode = 1;
} finally {
  await browser.close();
}
