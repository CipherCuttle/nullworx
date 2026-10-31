#!/usr/bin/env node
/**
 * G2/G3/G4 verification for the consolidated lab.
 * Requires a production server on BASE_URL and Playwright browsers.
 */
import { chromium, firefox, webkit } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { verifyMediaLoops } from "./media-loop/verify.mjs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3200";
const OUT = resolve("evidence/g4/labs");
const DIFF = resolve("scripts/pixel-diff.py");
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  { slug: "index", path: "/lab", stage: null, h1: /The consolidated lab/i },
  { slug: "ascii-waves", path: "/lab/ascii-waves", stage: "[data-testid='effect-preview']", h1: /ASCII Waves/i },
  { slug: "holotype", path: "/lab/holotype", stage: "[data-testid='holotype-preview']", h1: /HoloType/i },
  { slug: "paper-mesh", path: "/lab/paper-mesh", stage: "[data-testid='paper-mesh-preview']", h1: /Paper MeshGradient/i },
  { slug: "motion-signal", path: "/lab/motion-signal", stage: "[data-testid='motion-signal-preview']", h1: /Motion Signal Behavior/i },
  { slug: "signal-ui", path: "/lab/signal-ui", stage: "[data-testid='signal-ui-preview']", h1: /Signal UI primitives/i },
  { slug: "composition", path: "/lab/composition", stage: "[data-testid='composition-stage']", h1: /Material × Mask/i },
  { slug: "crt-material", path: "/lab/crt-material", stage: "[data-testid='crt-preview']", h1: /CRT Material Lab/i },
  { slug: "pearl-caustics", path: "/lab/pearl-caustics", stage: "[data-testid='pearl-preview']", h1: /Pearl Caustics/i },
  { slug: "terminal-rain", path: "/lab/terminal-rain", stage: "[data-testid='terminal-rain-preview']", h1: /Terminal Rain/i },
];

const checks = [];
function check(name, pass, detail) {
  checks.push({ name, pass: Boolean(pass), detail });
}
function diff(a, b) {
  return JSON.parse(execFileSync("python3", [DIFF, a, b], { encoding: "utf8" }));
}
function hook(page) {
  const logs = { console: [], page: [], request: [], external: [], cancellation: [] };
  page.on("console", (message) => { if (message.type() === "error") logs.console.push(message.text()); });
  page.on("pageerror", (error) => {
    if (/_rsc=/.test(error.message) && /access control checks/i.test(error.message)) logs.cancellation.push(error.message);
    else logs.page.push(error.message);
  });
  page.on("requestfailed", (request) => {
    const text = `${request.url()} ${request.failure()?.errorText}`;
    if (/Load request cancelled|NS_BINDING_ABORTED|net::ERR_ABORTED/i.test(text)) logs.cancellation.push(text);
    else logs.request.push(text);
  });
  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith(BASE) && !url.startsWith("data:") && !url.startsWith("blob:")) logs.external.push(url);
  });
  return logs;
}
async function stageShot(page, selector, path) {
  const locator = page.locator(selector);
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await locator.screenshot({ path });
}

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--use-gl=angle", "--use-angle=gl", "--ignore-gpu-blocklist", "--enable-gpu"],
});

// ── Route matrix, console/network, screenshots ──────────────────────────────
for (const route of ROUTES) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const logs = hook(page);
  const response = await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 45000 });
  const h1 = await page.locator("h1").allTextContents();
  const layout = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    banner: Boolean(document.querySelector("header")),
    footer: Boolean(document.querySelector("footer")),
    main: Boolean(document.querySelector("main")),
    text: document.body.innerText,
  }));
  check(`route/${route.slug}: HTTP 200`, response?.status() === 200, response?.status());
  check(`route/${route.slug}: one h1`, h1.length === 1, h1);
  check(`route/${route.slug}: h1 matches`, route.h1.test(h1[0] ?? ""), h1[0]);
  check(`route/${route.slug}: no horizontal overflow`, layout.scrollWidth === layout.clientWidth, { scrollWidth: layout.scrollWidth, clientWidth: layout.clientWidth });
  check(`route/${route.slug}: brand banner/main/footer`, layout.banner && layout.main && layout.footer, { banner: layout.banner, main: layout.main, footer: layout.footer });
  if (route.slug !== "index") {
    check(`route/${route.slug}: no release approval copy`, /No release approval is recorded|not a public release/i.test(layout.text), true);
    const stage = page.locator(route.stage);
    check(`route/${route.slug}: preview stage present`, await stage.count() === 1, route.stage);
    await page.screenshot({ path: `${OUT}/${route.slug}-desktop.png`, fullPage: true });
    await stageShot(page, route.stage, `${OUT}/${route.slug}-stage.png`);
  } else {
    await page.screenshot({ path: `${OUT}/index-desktop.png`, fullPage: true });
    const links = await page.locator("a[data-integrated='true']").count();
    check("route/index: integrated preview links", links === 9, links);
  }
  check(`route/${route.slug}: no console errors`, logs.console.length === 0, logs.console);
  check(`route/${route.slug}: no page errors`, logs.page.length === 0, logs.page);
  check(`route/${route.slug}: no failed requests`, logs.request.length === 0, logs.request);
  check(`route/${route.slug}: no external requests`, logs.external.length === 0, logs.external);
  await context.close();
}

// ── ASCII Waves lab: live, pause, reduced ───────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/lab/ascii-waves`, { waitUntil: "networkidle" });
  const stage = page.locator("[data-ascii-stage]");
  await stage.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector("[data-ascii-stage]")?.getAttribute("data-playback") === "live", null, { timeout: 25000 });
  await stage.screenshot({ path: `${OUT}/ascii-live-a.png` });
  await page.waitForTimeout(900);
  await stage.screenshot({ path: `${OUT}/ascii-live-b.png` });
  const movement = diff(`${OUT}/ascii-live-a.png`, `${OUT}/ascii-live-b.png`);
  check("ascii-lab: temporal movement", movement.diffPercent > 1, movement);
  const state = await stage.evaluate((el) => ({ playback: el.getAttribute("data-playback"), ready: el.getAttribute("data-ready"), readout: document.querySelector("[class*='renderState']")?.textContent }));
  check("ascii-lab: toolbar reports live", state.playback === "live" && state.ready === "true", state);
  await page.getByRole("button", { name: "Motion", exact: true }).click();
  await page.waitForTimeout(600);
  await stage.screenshot({ path: `${OUT}/ascii-paused-a.png` });
  await page.waitForTimeout(800);
  await stage.screenshot({ path: `${OUT}/ascii-paused-b.png` });
  const paused = diff(`${OUT}/ascii-paused-a.png`, `${OUT}/ascii-paused-b.png`);
  check("ascii-lab: pause is stable", paused.diffPercent <= 0.1, paused);
  const pausedState = await stage.evaluate((el) => el.getAttribute("data-playback"));
  check("ascii-lab: paused label is not live", pausedState === "paused", pausedState);
  await context.close();

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(`${BASE}/lab/ascii-waves`, { waitUntil: "networkidle" });
  await reducedPage.locator("[data-ascii-stage]").scrollIntoViewIfNeeded();
  await reducedPage.waitForFunction(() => document.querySelector("[data-ascii-stage]")?.getAttribute("data-playback") === "reduced", null, { timeout: 25000 });
  const reducedState = await reducedPage.locator("[data-ascii-stage]").evaluate((el) => el.getAttribute("data-playback"));
  check("ascii-lab: reduced motion state", reducedState === "reduced", reducedState);
  await reduced.close();
}

// ── HoloType ────────────────────────────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/lab/holotype`, { waitUntil: "networkidle" });
  const stage = page.locator("[data-testid='holotype-preview']");
  await stage.scrollIntoViewIfNeeded();
  await stage.screenshot({ path: `${OUT}/holotype-a.png` });
  await page.waitForTimeout(900);
  await stage.screenshot({ path: `${OUT}/holotype-b.png` });
  const movement = diff(`${OUT}/holotype-a.png`, `${OUT}/holotype-b.png`);
  check("holotype: animated material changes", movement.diffPercent > 0.05, movement);
  await page.getByLabel("Animated").uncheck();
  await page.waitForTimeout(600);
  await stage.screenshot({ path: `${OUT}/holotype-still-a.png` });
  await page.waitForTimeout(900);
  await stage.screenshot({ path: `${OUT}/holotype-still-b.png` });
  const still = diff(`${OUT}/holotype-still-a.png`, `${OUT}/holotype-still-b.png`);
  check("holotype: explicit still is stable", still.diffPercent <= 0.1, still);
  check("holotype: still state is exposed", (await stage.getAttribute("data-reduced")) === "true", await stage.getAttribute("data-reduced"));
  await context.close();
}

// ── Paper MeshGradient ─────────────────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/lab/paper-mesh`, { waitUntil: "networkidle" });
  const stage = page.locator("[data-testid='paper-mesh-preview']");
  await stage.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector("[data-testid='paper-mesh-preview']")?.getAttribute("data-webgl") === "ready", null, { timeout: 20000 });
  await stage.screenshot({ path: `${OUT}/paper-a.png` });
  await page.waitForTimeout(900);
  await stage.screenshot({ path: `${OUT}/paper-b.png` });
  const movement = diff(`${OUT}/paper-a.png`, `${OUT}/paper-b.png`);
  check("paper: upstream shader animates", movement.diffPercent > 0.05, movement);
  check("paper: canvas exists", await page.locator("[data-testid='paper-mesh-preview'] canvas").count() === 1, true);
  await page.getByLabel("Pause shader").check();
  await page.waitForTimeout(700);
  await stage.screenshot({ path: `${OUT}/paper-paused-a.png` });
  await page.waitForTimeout(900);
  await stage.screenshot({ path: `${OUT}/paper-paused-b.png` });
  const paused = diff(`${OUT}/paper-paused-a.png`, `${OUT}/paper-paused-b.png`);
  check("paper: pause holds the shader", paused.diffPercent <= 0.1, paused);
  check("paper: paused state is exposed", (await stage.getAttribute("data-paused")) === "true", true);
  await context.close();
}

// ── Motion behaviour ───────────────────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/lab/motion-signal`, { waitUntil: "networkidle" });
  const stage = page.locator("[data-testid='motion-signal-preview']");
  await stage.scrollIntoViewIfNeeded();
  const running = async () => page.locator("[data-motion-pulse]").evaluate((el) => el.getAnimations().filter((animation) => animation.playState === "running").length);
  check("motion: scan pulse is running", await running() > 0, await running());
  await page.getByTestId("motion-signal-preview").getByRole("button", { name: /Hold/i }).click();
  await page.waitForTimeout(500);
  check("motion: hold stops the pulse", await running() === 0, await running());
  check("motion: mode attribute", (await stage.getAttribute("data-mode")) === "hold", true);
  await page.getByRole("button", { name: "Replay entry" }).click();
  await page.waitForTimeout(300);
  await context.close();

  const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const reducedPage = await reduced.newPage();
  await reducedPage.goto(`${BASE}/lab/motion-signal`, { waitUntil: "networkidle" });
  await reducedPage.locator("[data-testid='motion-signal-preview']").scrollIntoViewIfNeeded();
  check("motion: reduced motion removes pulse", await reducedPage.locator("[data-motion-pulse]").evaluate((el) => el.getAnimations().filter((animation) => animation.playState === "running").length) === 0, true);
  await reduced.close();
}

// ── Composition A–D ───────────────────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const logs = hook(page);
  await page.goto(`${BASE}/lab/composition`, { waitUntil: "networkidle" });
  const stage = page.locator("[data-testid='composition-stage']");
  await stage.scrollIntoViewIfNeeded();
  const read = () => page.locator("[data-testid='composition-lab']").evaluate((el) => ({
    mask: el.getAttribute("data-mask"),
    material: el.getAttribute("data-material"),
    recipe: el.getAttribute("data-recipe"),
    paused: el.getAttribute("data-paused"),
    reduced: el.getAttribute("data-reduced"),
  }));
  const a = await read();
  check("composition: preset A is moth × HoloType", a.mask === "nullworx-moth" && a.material === "holotype-foil" && a.recipe === "a-moth-holotype", a);
  await stage.screenshot({ path: `${OUT}/composition-a.png` });
  await page.getByTestId("preset-b").click();
  await page.waitForTimeout(1200);
  const b = await read();
  check("composition: preset B is moth × Paper", b.mask === "nullworx-moth" && b.material === "paper-mesh-gradient" && b.recipe === "b-moth-paper", b);
  check("composition: preset B mounts a canvas", await stage.locator("canvas").count() === 1, true);
  await stage.screenshot({ path: `${OUT}/composition-b.png` });
  await page.getByTestId("preset-d").click();
  await page.waitForTimeout(1200);
  const d = await read();
  check("composition: preset D is wordmark × Paper", d.mask === "nullworx-wordmark" && d.material === "paper-mesh-gradient" && d.recipe === "d-wordmark-paper", d);
  await stage.screenshot({ path: `${OUT}/composition-d.png` });
  await page.getByTestId("preset-a").click();
  await page.waitForTimeout(500);
  check("composition: switching back to A removes the Paper canvas", await stage.locator("canvas").count() === 0, true);
  await page.getByLabel("Pause material").check();
  await page.waitForTimeout(600);
  await stage.screenshot({ path: `${OUT}/composition-paused-a.png` });
  await page.waitForTimeout(800);
  await stage.screenshot({ path: `${OUT}/composition-paused-b.png` });
  const paused = diff(`${OUT}/composition-paused-a.png`, `${OUT}/composition-paused-b.png`);
  check("composition: pause is stable", paused.diffPercent <= 0.1, paused);
  await page.getByLabel("Force reduced motion").check();
  await page.waitForTimeout(500);
  check("composition: force reduced state", (await read()).reduced === "true", true);
  check("composition: no application errors", logs.console.length === 0 && logs.page.length === 0, logs);
  await context.close();
}

// ── CRT ─────────────────────────────────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/lab/crt-material`, { waitUntil: "networkidle" });
  const stage = page.locator("[data-testid='crt-preview']");
  await stage.scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Broken Signal" }).click();
  await page.waitForTimeout(500);
  const runningAnimations = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").map((animation) => animation.animationName));
  check("crt: broken preset starts CSS animations", runningAnimations.some((name) => /signalJitter|tearA|tearB/.test(String(name))), runningAnimations);
  // The source material is deliberately intermittent: tear and jitter occupy
  // short slices of an 8-second cycle. Seek the CSS animations to the tear
  // phase so the motion receipt is deterministic rather than a timing lottery.
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      const name = String(animation.animationName ?? "");
      if (/signalJitter|tearA|tearB/.test(name)) {
        animation.pause();
        animation.currentTime = Number(animation.effect?.getTiming().duration ?? 0) * 0.84;
      }
    }
  });
  await page.waitForTimeout(200);
  await stage.screenshot({ path: `${OUT}/crt-tear.png` });
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      const name = String(animation.animationName ?? "");
      if (/signalJitter|tearA|tearB/.test(name)) animation.currentTime = 0;
    }
  });
  await page.waitForTimeout(200);
  await stage.screenshot({ path: `${OUT}/crt-a.png` });
  const movement = diff(`${OUT}/crt-a.png`, `${OUT}/crt-tear.png`);
  check("crt: animated treatment changes at the tear phase", movement.diffPercent > 0.01, movement);
  await page.getByLabel("Freeze the beam and tears").check();
  await page.waitForTimeout(600);
  await stage.screenshot({ path: `${OUT}/crt-still-a.png` });
  await page.waitForTimeout(900);
  await stage.screenshot({ path: `${OUT}/crt-still-b.png` });
  const still = diff(`${OUT}/crt-still-a.png`, `${OUT}/crt-still-b.png`);
  check("crt: still state is stable", still.diffPercent <= 0.1, still);
  check("crt: still attribute", (await stage.getAttribute("data-still")) === "true", true);
  await page.getByRole("button", { name: "Broken Signal" }).click();
  await page.waitForTimeout(500);
  check("crt: broken preset switches", (await stage.getAttribute("data-preset")) === "broken", true);
  await context.close();
}

// ── Pearl Caustics ─────────────────────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/lab/pearl-caustics`, { waitUntil: "networkidle" });
  const stage = page.locator("[data-testid='pearl-preview']");
  await stage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const renderState = await stage.getAttribute("data-render-state");
  check("pearl: WebGL render state", renderState === "webgl", renderState);
  await stage.screenshot({ path: `${OUT}/pearl-a.png` });
  await page.waitForTimeout(900);
  await stage.screenshot({ path: `${OUT}/pearl-b.png` });
  const movement = diff(`${OUT}/pearl-a.png`, `${OUT}/pearl-b.png`);
  check("pearl: caustic field animates", movement.diffPercent > 0.02, movement);
  await page.getByLabel("Pause caustics").check();
  await page.waitForTimeout(700);
  await stage.screenshot({ path: `${OUT}/pearl-paused-a.png` });
  await page.waitForTimeout(900);
  await stage.screenshot({ path: `${OUT}/pearl-paused-b.png` });
  const paused = diff(`${OUT}/pearl-paused-a.png`, `${OUT}/pearl-paused-b.png`);
  check("pearl: pause holds phase", paused.diffPercent <= 0.1, paused);
  await context.close();
}

// ── Terminal Rain ──────────────────────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/lab/terminal-rain`, { waitUntil: "networkidle" });
  const stage = page.locator("[data-testid='terminal-rain-preview']");
  await stage.scrollIntoViewIfNeeded();
  await stage.screenshot({ path: `${OUT}/rain-a.png` });
  await page.waitForTimeout(900);
  await stage.screenshot({ path: `${OUT}/rain-b.png` });
  const movement = diff(`${OUT}/rain-a.png`, `${OUT}/rain-b.png`);
  check("rain: stream animates", movement.diffPercent > 0.1, movement);
  await page.getByLabel("Play stream").uncheck();
  await page.waitForTimeout(600);
  await stage.screenshot({ path: `${OUT}/rain-paused-a.png` });
  await page.waitForTimeout(900);
  await stage.screenshot({ path: `${OUT}/rain-paused-b.png` });
  const paused = diff(`${OUT}/rain-paused-a.png`, `${OUT}/rain-paused-b.png`);
  check("rain: pause is stable", paused.diffPercent <= 0.1, paused);
  await context.close();
}

// ── Signal UI primitives ───────────────────────────────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/lab/signal-ui`, { waitUntil: "networkidle" });
  await page.locator("[data-testid='signal-ui-preview']").scrollIntoViewIfNeeded();
  const button = page.getByRole("button", { name: /Run command/i });
  await button.click();
  check("signal-ui: button interaction increments", await page.getByText(/Presses: 1/).isVisible(), true);
  await page.getByLabel("Show loading state").check();
  check("signal-ui: loading state sets aria-busy", await page.getByRole("button", { name: /Transmitting/i }).getAttribute("aria-busy") === "true", true);
  await page.getByRole("button", { name: "Replay heading" }).click();
  await page.waitForTimeout(300);
  await context.close();
}

// ── Cross-browser homepage and route smoke ─────────────────────────────────
const engines = [
  { name: "chromium", engine: chromium, options: { channel: "chrome", args: ["--use-gl=angle", "--use-angle=gl", "--ignore-gpu-blocklist"] } },
  { name: "firefox", engine: firefox, options: {} },
  { name: "webkit", engine: webkit, options: {} },
];
const crossBrowser = [];
for (const { name, engine, options } of engines) {
  let cross;
  try {
    cross = await engine.launch({ headless: true, ...options });
  } catch (error) {
    crossBrowser.push({ engine: name, launchError: String(error) });
    check(`${name}: browser launch`, false, String(error));
    continue;
  }
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const mobile = viewport.width < 500;
    const context = await cross.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    const logs = hook(page);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 45000 });
    await page.waitForTimeout(3500);
    const home = await page.evaluate(() => {
      const stage = document.querySelector("[data-ascii-stage]");
      const video = stage?.querySelector("video");
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2");
      const debug = gl?.getExtension("WEBGL_debug_renderer_info");
      return {
        playback: stage?.getAttribute("data-playback"),
        ready: stage?.getAttribute("data-ready"),
        videoTime: Number(stage?.getAttribute("data-video-time") ?? 0),
        frames: Number(stage?.getAttribute("data-frame-count") ?? 0),
        videoSrc: video?.currentSrc ?? null,
        videoPaused: video?.paused ?? null,
        readout: document.querySelector("[data-home-field] [class*='readout']")?.textContent?.trim() ?? null,
        renderer: debug && gl ? String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)) : null,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      };
    });
    const label = `${name}/${mobile ? "mobile" : "desktop"}`;
    check(`${label}: homepage live`, home.playback === "live", home);
    check(`${label}: video timeline advances`, home.videoTime > 0.2, home.videoTime);
    check(`${label}: renderer frame count advances`, home.frames > 20, home.frames);
    check(`${label}: readout is LIVE`, home.readout === "LIVE MATERIAL / WEBGL 2", home.readout);
    check(`${label}: no horizontal overflow`, home.scrollWidth === home.clientWidth, { scrollWidth: home.scrollWidth, clientWidth: home.clientWidth });
    check(`${label}: no application errors`, logs.console.length === 0 && logs.page.length === 0, logs);
    await page.screenshot({ path: `${OUT}/cross-${name}-${mobile ? "mobile" : "desktop"}-home.png`, fullPage: false });

    for (const route of ROUTES.filter((item) => item.slug !== "index")) {
      await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle", timeout: 45000 });
      const stageCount = await page.locator(route.stage).count();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth === document.documentElement.clientWidth);
      check(`${label}: ${route.slug} stage mounts`, stageCount >= 1, stageCount);
      check(`${label}: ${route.slug} no overflow`, overflow, true);
      check(`${label}: ${route.slug} no errors`, logs.console.length === 0 && logs.page.length === 0 && logs.request.length === 0, logs);
      if (route.slug === "paper-mesh") {
        const webgl = await page.locator("[data-testid='paper-mesh-preview']").getAttribute("data-webgl");
        check(`${label}: paper WebGL ready`, webgl === "ready", webgl);
      }
      if (route.slug === "pearl-caustics") {
        const render = await page.locator("[data-testid='pearl-preview']").getAttribute("data-render-state");
        check(`${label}: pearl render state`, render === "webgl" || render === "software-still", render);
      }
    }
    crossBrowser.push({ engine: name, viewport, home, logs });
    await context.close();
  }
  await cross.close();
}

// ── Repeated mounts and WebGL context accounting ───────────────────────────
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const saved = JSON.parse(sessionStorage.getItem("__nwx_gl") || '{"created":0,"lost":0}');
    window.__gl = saved;
    const persist = () => sessionStorage.setItem("__nwx_gl", JSON.stringify(window.__gl));
    const seen = new WeakSet();
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
      const result = original.call(this, type, ...args);
      if (result && /webgl/i.test(String(type)) && !seen.has(this)) {
        seen.add(this);
        window.__gl.created += 1;
        persist();
        this.addEventListener("webglcontextlost", () => {
          window.__gl.lost += 1;
          persist();
        });
      }
      return result;
    };
  });
  await page.goto(`${BASE}/lab`, { waitUntil: "networkidle" });
  const before = await page.evaluate(() => ({ gl: { ...window.__gl }, nodes: document.querySelectorAll("*").length, heap: performance.memory?.usedJSHeapSize ?? null }));
  const mounted = [];
  for (let cycle = 0; cycle < 3; cycle += 1) {
    for (const path of ["/lab/paper-mesh", "/lab/pearl-caustics", "/lab/terminal-rain", "/lab/composition"]) {
      await page.locator(`a[href="${path}"]`).first().click();
      await page.waitForURL(`**${path}`);
      if (path === "/lab/composition") {
        await page.getByTestId("preset-b").click();
        await page.waitForTimeout(700);
      }
      await page.waitForTimeout(600);
      mounted.push(await page.evaluate(() => ({ path: location.pathname, gl: { ...window.__gl }, canvases: document.querySelectorAll("canvas").length })));
      await page.locator('a[href="/lab"]').first().click();
      await page.waitForURL("**/lab");
      await page.waitForTimeout(250);
    }
  }
  const after = await page.evaluate(() => ({
    gl: { ...window.__gl },
    nodes: document.querySelectorAll("*").length,
    canvases: document.querySelectorAll("canvas").length,
    heap: performance.memory?.usedJSHeapSize ?? null,
  }));
  check("resources: WebGL contexts are explicitly released", after.gl.created >= 6 && after.gl.lost >= after.gl.created - 1, { before, after, mounted });
  check("resources: every navigated route leaves no canvas on the index", after.canvases === 0, after.canvases);
  check("resources: DOM node count bounded", Math.abs(after.nodes - before.nodes) < 300, { before: before.nodes, after: after.nodes });
  check("resources: heap bounded", !before.heap || !after.heap || after.heap - before.heap < 40 * 1024 * 1024, { before: before.heap, after: after.heap });
  await context.close();
}

await browser.close();
// Loop proof is a required gate, separate from the route matrix's readiness
// snapshots. It runs at 1x across >=3 real boundaries and keeps negative controls.
const mediaLoops = await verifyMediaLoops({ baseURL: BASE, check });
const result = {
  generatedAt: new Date().toISOString(),
  baseUrl: BASE,
  checks,
  total: checks.length,
  passed: checks.filter((item) => item.pass).length,
  failed: checks.filter((item) => !item.pass).length,
  errors: checks.filter((item) => !item.pass),
  crossBrowser,
  mediaLoops,
};
writeFileSync(`${OUT}/lab-verification.json`, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ total: result.total, passed: result.passed, failed: result.failed, errors: result.errors }, null, 2));
if (result.failed > 0) process.exitCode = 1;
