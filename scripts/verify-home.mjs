#!/usr/bin/env node
/**
 * G1 / G4 homepage temporal verification.
 *
 * Requires a production server on BASE_URL (default http://127.0.0.1:3200)
 * and a Chromium build with hardware WebGL. Every check is written to
 * evidence/g4/home-verification.json with the screenshots it references.
 */
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3200";
const OUT = resolve("evidence/g4/home");
const DIFF = resolve("scripts/pixel-diff.py");
mkdirSync(OUT, { recursive: true });

const checks = [];
const errors = [];
function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail });
  if (!pass) errors.push({ name, detail });
}
function diff(a, b) {
  return JSON.parse(execFileSync("python3", [DIFF, a, b], { encoding: "utf8" }));
}

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--ignore-gpu-blocklist", "--enable-gpu"],
});

async function contextPage(contextOptions = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    reducedMotion: "no-preference",
    ...contextOptions,
  });
  const page = await context.newPage();
  const logs = [];
  page.on("pageerror", (error) => logs.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") logs.push(`console.error: ${message.text()}`);
  });
  page.on("requestfailed", (request) => logs.push(`requestfailed: ${request.url()} ${request.failure()?.errorText}`));
  return { context, page, logs };
}

async function readField(page) {
  return page.evaluate(() => {
    const stage = document.querySelector("[data-ascii-stage]");
    const video = stage?.querySelector("video");
    const canvas = stage?.querySelector("canvas");
    const poster = stage?.querySelector("img");
    const readout = document.querySelector("[data-home-field] [class*='readout']");
    const center = stage ? document.elementFromPoint(
      stage.getBoundingClientRect().x + stage.getBoundingClientRect().width / 2,
      stage.getBoundingClientRect().y + stage.getBoundingClientRect().height / 2,
    ) : null;
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2");
    const debug = gl?.getExtension("WEBGL_debug_renderer_info");
    return {
      playback: stage?.getAttribute("data-playback") ?? null,
      ready: stage?.getAttribute("data-ready") ?? null,
      live: stage?.getAttribute("data-live") ?? null,
      videoTime: Number(stage?.getAttribute("data-video-time") ?? 0),
      frameCount: Number(stage?.getAttribute("data-frame-count") ?? 0),
      waveClock: Number(stage?.getAttribute("data-wave-clock") ?? 0),
      pointerStrength: Number(stage?.getAttribute("data-pointer-strength") ?? 0),
      video: video ? {
        src: video.currentSrc,
        paused: video.paused,
        time: video.currentTime,
        readyState: video.readyState,
        error: video.error?.code ?? null,
        muted: video.muted,
      } : null,
      canvas: canvas ? {
        width: canvas.width,
        height: canvas.height,
        hidden: canvas.hidden,
        z: getComputedStyle(canvas).zIndex,
        display: getComputedStyle(canvas).display,
      } : null,
      poster: poster ? {
        src: poster.getAttribute("src"),
        z: getComputedStyle(poster).zIndex,
        opacity: getComputedStyle(poster).opacity,
      } : null,
      center: center ? { tag: center.tagName, className: String(center.className) } : null,
      readout: readout?.textContent?.trim() ?? null,
      renderer: debug && gl ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : null,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
}

async function waitPhase(page, phase, timeout = 20000) {
  await page.waitForFunction(
    (expected) => document.querySelector("[data-ascii-stage]")?.getAttribute("data-playback") === expected,
    phase,
    { timeout },
  );
}

// ── 1. Live temporal animation ───────────────────────────────────────────────
{
  const { context, page, logs } = await contextPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await waitPhase(page, "live");
  const a = await readField(page);
  await page.locator("[data-ascii-stage]").screenshot({ path: `${OUT}/live-a.png` });
  await page.waitForTimeout(1000);
  const b = await readField(page);
  await page.locator("[data-ascii-stage]").screenshot({ path: `${OUT}/live-b.png` });
  const movement = diff(`${OUT}/live-a.png`, `${OUT}/live-b.png`);

  check("home/live: playback reaches live", a.playback === "live", a.playback);
  check("home/live: video timeline advances", b.videoTime > a.videoTime + 0.2, { from: a.videoTime, to: b.videoTime });
  check("home/live: renderer frame count advances", b.frameCount > a.frameCount + 10, { from: a.frameCount, to: b.frameCount });
  check("home/live: wave clock advances", b.waveClock > a.waveClock + 0.2, { from: a.waveClock, to: b.waveClock });
  check("home/live: canvas paints above poster", b.center?.tag === "CANVAS", b.center);
  check("home/live: canvas is visible and opaque", b.canvas && !b.canvas.hidden && b.canvas.display !== "none", b.canvas);
  check("home/live: live readout is truthful", b.readout === "LIVE MATERIAL / WEBGL 2", b.readout);
  check("home/live: source video is playing", b.video && !b.video.paused && b.video.readyState >= 2, b.video);
  check("home/live: rendered pixels move over time", movement.diffPercent > 1 && movement.bbox !== null, movement);
  check("home/live: no horizontal overflow", b.scrollWidth === b.clientWidth, { scrollWidth: b.scrollWidth, clientWidth: b.clientWidth });

  // Pointer eddy while live.
  const box = await page.locator("[data-ascii-stage]").boundingBox();
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.55);
  await page.waitForTimeout(700);
  const pointed = await readField(page);
  await page.mouse.move(80, 80);
  await page.waitForTimeout(900);
  const settled = await readField(page);
  check("home/pointer: pointer increases eddy strength", pointed.pointerStrength > 0.2, pointed.pointerStrength);
  check("home/pointer: pointer settles after leave", settled.pointerStrength < 0.12, settled.pointerStrength);

  // Pause is a real negative control.
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await waitPhase(page, "paused");
  const pausedA = await readField(page);
  await page.locator("[data-ascii-stage]").screenshot({ path: `${OUT}/paused-a.png` });
  await page.waitForTimeout(1000);
  const pausedB = await readField(page);
  await page.locator("[data-ascii-stage]").screenshot({ path: `${OUT}/paused-b.png` });
  const pausedDiff = diff(`${OUT}/paused-a.png`, `${OUT}/paused-b.png`);
  check("home/pause: readout is not LIVE", pausedB.readout === "PAUSED / FRAME HELD", pausedB.readout);
  check("home/pause: video timeline stops", pausedA.videoTime === pausedB.videoTime, { a: pausedA.videoTime, b: pausedB.videoTime });
  check("home/pause: wave clock freezes", pausedA.waveClock === pausedB.waveClock, { a: pausedA.waveClock, b: pausedB.waveClock });
  check("home/pause: rendered pixels remain stable", pausedDiff.diffPercent <= 0.1, pausedDiff);

  await page.getByRole("button", { name: "Play", exact: true }).click();
  await waitPhase(page, "live");
  await page.waitForTimeout(800);
  const resumed = await readField(page);
  check("home/resume: playback returns live", resumed.playback === "live", resumed.playback);
  check("home/resume: timeline advances after resume", resumed.videoTime > pausedB.videoTime + 0.1, { paused: pausedB.videoTime, resumed: resumed.videoTime });
  check("home/live: no application console errors", logs.length === 0, logs);
  await context.close();
}

// ── 2. Reduced motion is intentional and labelled ────────────────────────────
{
  const { context, page, logs } = await contextPage({ reducedMotion: "reduce" });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await waitPhase(page, "reduced");
  const a = await readField(page);
  await page.locator("[data-ascii-stage]").screenshot({ path: `${OUT}/reduced-a.png` });
  await page.waitForTimeout(1000);
  const b = await readField(page);
  await page.locator("[data-ascii-stage]").screenshot({ path: `${OUT}/reduced-b.png` });
  const still = diff(`${OUT}/reduced-a.png`, `${OUT}/reduced-b.png`);
  check("home/reduced: phase is reduced", a.playback === "reduced", a.playback);
  check("home/reduced: readout names reduced motion", b.readout === "REDUCED MOTION / STILL", b.readout);
  check("home/reduced: readout never claims LIVE", !b.readout?.includes("LIVE"), b.readout);
  check("home/reduced: video is paused", b.video?.paused === true, b.video);
  check("home/reduced: video timeline does not advance", a.videoTime === b.videoTime, { a: a.videoTime, b: b.videoTime });
  check("home/reduced: wave clock is frozen", a.waveClock === b.waveClock && a.waveClock < 0.05, { a: a.waveClock, b: b.waveClock });
  check("home/reduced: rendered pixels remain stable", still.diffPercent === 0, still);
  check("home/reduced: note is visible", await page.getByText(/Reduced motion is active/).isVisible(), true);
  check("home/reduced: no application console errors", logs.length === 0, logs);
  await context.close();
}

// ── 3. Blocked autoplay is labelled and recoverable ──────────────────────────
{
  const { context, page, logs } = await contextPage();
  await page.addInitScript(() => {
    window.__blockAutoplay = true;
    const original = HTMLMediaElement.prototype.play;
    window.__originalPlay = original;
    HTMLMediaElement.prototype.play = function play() {
      if (window.__blockAutoplay) {
        return Promise.reject(new DOMException("Autoplay blocked by test policy", "NotAllowedError"));
      }
      return original.call(this);
    };
  });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await waitPhase(page, "blocked", 30000);
  await page.waitForTimeout(700);
  const a = await readField(page);
  await page.locator("[data-ascii-stage]").screenshot({ path: `${OUT}/blocked-a.png` });
  await page.waitForTimeout(900);
  const b = await readField(page);
  await page.locator("[data-ascii-stage]").screenshot({ path: `${OUT}/blocked-b.png` });
  const blockedStill = diff(`${OUT}/blocked-a.png`, `${OUT}/blocked-b.png`);
  check("home/blocked: phase is blocked, not live", a.playback === "blocked" && a.live === "false", { playback: a.playback, live: a.live });
  check("home/blocked: readout never claims LIVE", !b.readout?.includes("LIVE"), b.readout);
  check("home/blocked: start control is present", await page.getByRole("button", { name: /Start live field/i }).isVisible(), true);
  check("home/blocked: video is paused", b.video?.paused === true, b.video);
  check("home/blocked: poster/video still frame remains stable", blockedStill.diffPercent <= 0.1, blockedStill);

  // Restore a normal browser policy, then press the real start control.
  await page.evaluate(() => { window.__blockAutoplay = false; });
  await page.getByRole("button", { name: /Start live field/i }).click();
  await waitPhase(page, "live", 30000);
  await page.waitForTimeout(1200);
  const recovered = await readField(page);
  await page.locator("[data-ascii-stage]").screenshot({ path: `${OUT}/blocked-recovered.png` });
  check("home/blocked: start control recovers live playback", recovered.playback === "live", recovered.playback);
  check("home/blocked: recovered readout is LIVE", recovered.readout === "LIVE MATERIAL / WEBGL 2", recovered.readout);
  check("home/blocked: recovered video advances", recovered.videoTime > 0, recovered.videoTime);
  check("home/blocked: no application console errors", logs.length === 0, logs);
  await context.close();
}

// ── 4. Context loss and fallback ────────────────────────────────────────────
{
  const { context, page } = await contextPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await waitPhase(page, "live");
  const lost = await page.evaluate(() => {
    const canvas = document.querySelector("[data-ascii-stage] canvas");
    const gl = canvas?.getContext("webgl2");
    const ext = gl?.getExtension("WEBGL_lose_context");
    ext?.loseContext();
    return Boolean(ext);
  });
  await waitPhase(page, "error", 15000);
  const failed = await readField(page);
  await page.locator("[data-ascii-stage]").screenshot({ path: `${OUT}/context-lost.png` });
  check("home/context-loss: loss extension was invoked", lost, lost);
  check("home/context-loss: phase is error", failed.playback === "error", failed.playback);
  check("home/context-loss: readout is fallback, not LIVE", failed.readout === "FALLBACK / POSTER", failed.readout);
  check("home/context-loss: live claim is false", failed.live !== "true", failed.live);
  check("home/context-loss: fallback message is visible", await page.getByText(/Live field unavailable/).isVisible(), true);
  check("home/context-loss: poster remains present", Boolean(failed.poster), failed.poster);
  await context.close();
}

// ── 5. Page visibility pauses and resumes ──────────────────────────────────
{
  const { context, page } = await contextPage();
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await waitPhase(page, "live");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await waitPhase(page, "hidden", 15000);
  const hidden = await readField(page);
  check("home/visibility: hidden page pauses the field", hidden.playback === "hidden" && hidden.video?.paused === true, hidden);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await waitPhase(page, "live", 20000);
  const visible = await readField(page);
  check("home/visibility: visible page resumes the field", visible.playback === "live", visible.playback);
  await context.close();
}

// ── 6. Mobile temporal animation ────────────────────────────────────────────
{
  const { context, page, logs } = await contextPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await waitPhase(page, "live");
  const a = await readField(page);
  await page.locator("[data-ascii-stage]").screenshot({ path: `${OUT}/mobile-live-a.png` });
  await page.waitForTimeout(900);
  const b = await readField(page);
  await page.locator("[data-ascii-stage]").screenshot({ path: `${OUT}/mobile-live-b.png` });
  const movement = diff(`${OUT}/mobile-live-a.png`, `${OUT}/mobile-live-b.png`);
  check("home/mobile: live field animates", movement.diffPercent > 1, movement);
  check("home/mobile: video timeline advances", b.videoTime > a.videoTime + 0.2, { a: a.videoTime, b: b.videoTime });
  check("home/mobile: no horizontal overflow", b.scrollWidth === b.clientWidth, { scrollWidth: b.scrollWidth, clientWidth: b.clientWidth });
  check("home/mobile: no application console errors", logs.length === 0, logs);
  await page.screenshot({ path: `${OUT}/mobile-home.png`, fullPage: false });
  await context.close();
}

await browser.close();
const result = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE,
  renderer: checks.find((item) => item.name === "home/live: canvas paints above poster")?.detail,
  checks,
  total: checks.length,
  passed: checks.filter((item) => item.pass).length,
  failed: checks.filter((item) => !item.pass).length,
  errors,
};
writeFileSync(`${OUT}/home-verification.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ total: result.total, passed: result.passed, failed: result.failed, errors }, null, 2));
if (result.failed > 0) process.exitCode = 1;
