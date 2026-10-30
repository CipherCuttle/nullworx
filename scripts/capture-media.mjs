#!/usr/bin/env node
/** Captures before/after homepage clips and one motion clip per effect family. */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const AFTER = process.env.AFTER_URL ?? "http://127.0.0.1:3200";
const BEFORE = process.env.BEFORE_URL ?? "http://127.0.0.1:3203";
const DIR = resolve("evidence/g5/recordings");
mkdirSync(DIR, { recursive: true });
const results = [];

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--ignore-gpu-blocklist", "--enable-gpu"],
});

async function withRecording(name, action, contextOptions = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    recordVideo: { dir: DIR, size: { width: 1440, height: 900 } },
    ...contextOptions,
  });
  const page = await context.newPage();
  const logs = [];
  page.on("pageerror", (error) => logs.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") logs.push(`console.error: ${message.text()}`); });
  await action(page);
  const video = page.video();
  await context.close();
  const raw = await video.path();
  const webm = `${DIR}/${name}.webm`;
  const mp4 = `${DIR}/${name}.mp4`;
  if (raw !== webm) renameSync(raw, webm);
  execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", webm, "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", mp4]);
  results.push({ name, webm, mp4, bytes: readFileSync(mp4).length, logs });
}

async function readField(page) {
  return page.evaluate(() => {
    const stage = document.querySelector("[data-ascii-stage]");
    const video = stage?.querySelector("video");
    return {
      playback: stage?.getAttribute("data-playback") ?? null,
      ready: stage?.getAttribute("data-ready") ?? null,
      videoTime: Number(stage?.getAttribute("data-video-time") ?? 0),
      frameCount: Number(stage?.getAttribute("data-frame-count") ?? 0),
      readout: document.querySelector("[data-home-field] [class*='readout']")?.textContent?.trim() ?? null,
      videoSrc: video?.currentSrc ?? null,
      videoPaused: video?.paused ?? null,
    };
  });
}

// Before: the preserved foundation, including its hardcoded LIVE badge.
await withRecording("before-home-live", async (page) => {
  await page.goto(`${BEFORE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const a = await readField(page);
  await page.waitForTimeout(2500);
  const b = await readField(page);
  results.push({ beforeHomeLive: { a, b } });
});
await withRecording("before-home-reduced-motion-static", async (page) => {
  await page.goto(`${BEFORE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const a = await readField(page);
  await page.waitForTimeout(2500);
  const b = await readField(page);
  results.push({ beforeHomeReduced: { a, b } });
}, { reducedMotion: "reduce" });
await withRecording("before-home-autoplay-blocked-static", async (page) => {
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function play() {
      return Promise.reject(new DOMException("Autoplay blocked", "NotAllowedError"));
    };
    window.__originalPlay = original;
  });
  await page.goto(`${BEFORE}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);
  const a = await readField(page);
  await page.waitForTimeout(2500);
  const b = await readField(page);
  results.push({ beforeHomeBlocked: { a, b } });
});

// After: the consolidated homepage.
await withRecording("after-home-live", async (page) => {
  await page.goto(`${AFTER}/`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("[data-ascii-stage]")?.getAttribute("data-playback") === "live", null, { timeout: 25000 });
  const a = await readField(page);
  await page.waitForTimeout(3500);
  const b = await readField(page);
  results.push({ afterHomeLive: { a, b } });
});
await withRecording("after-home-reduced-motion-labelled", async (page) => {
  await page.goto(`${AFTER}/`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("[data-ascii-stage]")?.getAttribute("data-playback") === "reduced", null, { timeout: 25000 });
  await page.waitForTimeout(2500);
  const a = await readField(page);
  results.push({ afterHomeReduced: { a } });
}, { reducedMotion: "reduce" });
await withRecording("after-home-blocked-to-live", async (page) => {
  await page.addInitScript(() => {
    window.__blockAutoplay = true;
    const original = HTMLMediaElement.prototype.play;
    window.__originalPlay = original;
    HTMLMediaElement.prototype.play = function play() {
      if (window.__blockAutoplay) return Promise.reject(new DOMException("Autoplay blocked", "NotAllowedError"));
      return original.call(this);
    };
  });
  await page.goto(`${AFTER}/`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector("[data-ascii-stage]")?.getAttribute("data-playback") === "blocked", null, { timeout: 30000 });
  await page.waitForTimeout(1600);
  const blocked = await readField(page);
  await page.evaluate(() => { window.__blockAutoplay = false; });
  await page.getByRole("button", { name: /Start live field/i }).click();
  await page.waitForFunction(() => document.querySelector("[data-ascii-stage]")?.getAttribute("data-playback") === "live", null, { timeout: 30000 });
  await page.waitForTimeout(2800);
  const live = await readField(page);
  results.push({ afterHomeBlockedToLive: { blocked, live } });
});

// One clip per integrated effect route.
const clips = [
  ["after-lab-ascii-waves", "/lab/ascii-waves", "[data-ascii-stage]"],
  ["after-lab-holotype", "/lab/holotype", "[data-testid='holotype-preview']"],
  ["after-lab-paper-mesh", "/lab/paper-mesh", "[data-testid='paper-mesh-preview']"],
  ["after-lab-motion-signal", "/lab/motion-signal", "[data-testid='motion-signal-preview']"],
  ["after-lab-signal-ui", "/lab/signal-ui", "[data-testid='signal-ui-preview']"],
  ["after-lab-composition-b", "/lab/composition", "[data-testid='composition-stage']"],
  ["after-lab-crt-material", "/lab/crt-material", "[data-testid='crt-preview']"],
  ["after-lab-pearl-caustics", "/lab/pearl-caustics", "[data-testid='pearl-preview']"],
  ["after-lab-terminal-rain", "/lab/terminal-rain", "[data-testid='terminal-rain-preview']"],
];
for (const [name, path, selector] of clips) {
  await withRecording(name, async (page) => {
    await page.goto(`${AFTER}${path}`, { waitUntil: "networkidle" });
    const stage = page.locator(selector);
    await stage.scrollIntoViewIfNeeded();
    if (path === "/lab/composition") {
      await page.getByTestId("preset-b").click();
      await page.waitForTimeout(1200);
    }
    await page.waitForTimeout(2600);
  });
}

await browser.close();
writeFileSync(`${DIR}/manifest.json`, `${JSON.stringify({ generatedAt: new Date().toISOString(), beforeUrl: BEFORE, afterUrl: AFTER, results }, null, 2)}\n`);
console.log(JSON.stringify({ clips: results.filter((item) => item.name).map(({ name, bytes, logs }) => ({ name, bytes, logs })), receipts: results.filter((item) => !item.name) }, null, 2));
