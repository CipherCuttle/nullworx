#!/usr/bin/env node
/**
 * Short real-motion recordings of all four compositions.
 *
 * Playwright records the page at the browser's screencast cadence (25 fps in
 * this build), then ffmpeg crops the composition stage out of the 1440x900
 * frame. The screenshot-sequence clips in motion/<letter>-desktop/ remain the
 * timing-accurate evidence; these recordings are for human review.
 *
 * GPU utilisation is sampled concurrently with nvidia-smi and written to
 * gpu-utilization.json. It is host-level utilisation, not per-process.
 */
import { mkdir, rename, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright-core";

const ORIGIN = process.env.ORIGIN ?? "http://127.0.0.1:3100";
const EVIDENCE = path.resolve(process.env.EVIDENCE_DIR ?? "evidence/g3a1/gpu");
const RAW = path.join(EVIDENCE, "video-raw");
const OUT = path.join(EVIDENCE, "motion-video");
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const GPU_ARGS = ["--use-gl=angle", "--use-angle=gl", "--ignore-gpu-blocklist", "--disable-gpu-driver-bug-workarounds"];

await mkdir(RAW, { recursive: true });
await mkdir(OUT, { recursive: true });

// Host-level GPU sampling for the duration of the recordings.
const samples = [];
const sampler = spawn("nvidia-smi", [
  "--query-gpu=timestamp,utilization.gpu,memory.used,power.draw,temperature.gpu",
  "--format=csv,noheader,nounits",
  "-lms",
  "250",
]);
sampler.stdout.on("data", (chunk) => {
  for (const line of String(chunk).trim().split("\n")) {
    if (!line.trim()) continue;
    const [timestamp, util, memory, power, temp] = line.split(",").map((value) => value.trim());
    samples.push({ timestamp, utilizationGpu: Number(util), memoryUsedMiB: Number(memory), powerW: Number(power), temperatureC: Number(temp) });
  }
});

const results = [];
for (const letter of ["a", "b", "c", "d"]) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: GPU_ARGS });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    recordVideo: { dir: RAW, size: { width: 1440, height: 900 } },
  });
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/labs/composition`, { waitUntil: "networkidle" });
  await page.locator(`[data-testid="preset-${letter}"]`).click();
  await page.waitForTimeout(1200);
  const box = await page.locator('[data-testid="composition-stage-inner"]').boundingBox();
  const box2 = { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) };
  await page.waitForTimeout(4000);
  const video = page.video();
  await context.close();
  await browser.close();
  if (!video) continue;
  const source = await video.path();
  const target = path.join(RAW, `${letter}.webm`);
  await rename(source, target);
  results.push({ letter, source: target, box: box2, durationMs: 5200 });
  console.log(`${letter}: ${target} stage ${JSON.stringify(box2)}`);
}

sampler.kill("SIGTERM");
await new Promise((resolve) => setTimeout(resolve, 400));
const utils = samples
  .map((entry) => entry.utilizationGpu)
  .filter((value) => Number.isFinite(value) && value >= 0 && value <= 100)
  .sort((a, b) => a - b);
const mem = samples.map((entry) => entry.memoryUsedMiB).filter(Number.isFinite);
const power = samples.map((entry) => entry.powerW).filter(Number.isFinite);
const temps = samples.map((entry) => entry.temperatureC).filter(Number.isFinite);
const summary = {
  generatedAt: new Date().toISOString(),
  method: "nvidia-smi sampled every 250 ms during four 5.2 s headless Chromium recordings at 1440x900 DPR1.",
  samples: samples.length,
  utilization: { min: utils[0], median: utils[Math.floor(utils.length / 2)], p95: utils[Math.floor(utils.length * 0.95)], max: utils[utils.length - 1] },
  memoryUsedMiB: { min: Math.min(...mem), max: Math.max(...mem) },
  powerW: { min: Math.min(...power), max: Math.max(...power) },
  temperatureC: { min: Math.min(...temps), max: Math.max(...temps) },
  note: "Host-level GPU utilisation includes desktop compositing and other processes; it is not attributable solely to the composition.",
  samplesAll: samples,
};
await writeFile(path.join(EVIDENCE, "gpu-utilization.json"), JSON.stringify(summary, null, 2) + "\n");
await writeFile(path.join(EVIDENCE, "video-raw", "index.json"), JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 2));
