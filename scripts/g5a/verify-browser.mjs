#!/usr/bin/env node
/**
 * G5-A consumer browser verification.
 *
 *   ENGINE=chromium MODE=full node scripts/g5a/verify-browser.mjs
 *   ENGINE=firefox  MODE=smoke node scripts/g5a/verify-browser.mjs
 *
 * Runs against the two production consumer builds on 3201/3202. It never
 * substitutes the Nullworx demo: the source under test is the shadcn install.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, firefox, webkit } from "playwright-core";
import { channelDelta, decodePng, pixelAt } from "../lib/png.mjs";

const ENGINE = process.env.ENGINE ?? "chromium";
const MODE = process.env.MODE ?? (ENGINE === "chromium" ? "full" : "smoke");
const EVIDENCE = path.resolve(process.env.EVIDENCE_DIR ?? "evidence/g5a/browser");
const ORIGINS = [
  ["next", process.env.NEXT_ORIGIN ?? "http://127.0.0.1:3201"],
  ["vite", process.env.VITE_ORIGIN ?? "http://127.0.0.1:3202"],
];
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const GPU_ARGS = [
  "--use-gl=angle",
  "--use-angle=gl",
  "--ignore-gpu-blocklist",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
];

const checks = [];
const failures = [];
const findings = [];
const artifacts = {};
mkdir(path.join(EVIDENCE, ENGINE), { recursive: true });

function check(name, condition, detail = "") {
  if (condition) checks.push(name);
  else failures.push({ name, detail });
}
function finding(name, detail) {
  findings.push({ name, detail });
}
function shouldRun(smoke = false) {
  return MODE === "full" || !smoke;
}

const initScript = () => {
  const state = {
    rafCalls: 0,
    contextsCreated: 0,
    contextsLost: 0,
    contextsLive: 0,
    canvasCreates: 0,
    maskReady: [],
    staleReady: 0,
    keyByUrl: {},
  };
  window.__g5a = state;

  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    state.rafCalls += 1;
    return raf(callback);
  };

  const origCreateElement = Document.prototype.createElement;
  Document.prototype.createElement = function createElement(tag, ...args) {
    if (String(tag).toLowerCase() === "canvas") state.canvasCreates += 1;
    return origCreateElement.call(this, tag, ...args);
  };

  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
    const context = origGetContext.call(this, type, ...args);
    if (context && /webgl2/i.test(String(type))) {
      state.contextsCreated += 1;
      state.contextsLive += 1;
    }
    return context;
  };

  const loseWrappers = new WeakMap();
  const origGetExtension = WebGL2RenderingContext.prototype.getExtension;
  WebGL2RenderingContext.prototype.getExtension = function getExtension(name) {
    const extension = origGetExtension.call(this, name);
    if (String(name).toLowerCase() !== "webgl_lose_context" || !extension) return extension;
    let wrapped = loseWrappers.get(extension);
    if (!wrapped) {
      const originalLose = extension.loseContext.bind(extension);
      wrapped = {
        ...extension,
        loseContext() {
          state.contextsLost += 1;
          state.contextsLive = Math.max(0, state.contextsLive - 1);
          return originalLose();
        },
      };
      loseWrappers.set(extension, wrapped);
    }
    return wrapped;
  };

  window.addEventListener("DOMContentLoaded", () => {
    const root = document.querySelector("[data-living-type]");
    if (!root) return;
    const observer = new MutationObserver(() => {
      const layer = root.querySelector('[data-ready]');
      if (!layer) return;
      const visible = layer.getAttribute("data-ready") === "true";
      const text = root.getAttribute("data-text");
      const maskState = root.getAttribute("data-mask-state");
      const key = root.getAttribute("data-mask-key");
      const mask = getComputedStyle(layer).maskImage;
      if (visible && maskState !== "ready") {
        state.staleReady += 1;
      }
      if (visible && maskState === "ready" && mask && mask !== "none") {
        const knownKey = state.keyByUrl[mask];
        if (knownKey !== undefined && knownKey !== key) state.staleReady += 1;
        state.keyByUrl[mask] = key;
      }
      if (state.maskReady.length < 240) {
        state.maskReady.push({
          text,
          state: maskState,
          key,
          ready: visible,
        });
      }
    });
    observer.observe(root, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-text", "data-mask-state", "data-mask-key", "data-ready", "style"],
    });
  });
};

async function launch() {
  if (ENGINE === "chromium") {
    return chromium.launch({ executablePath: CHROME, headless: true, args: GPU_ARGS });
  }
  if (ENGINE === "firefox") return firefox.launch({ headless: true });
  if (ENGINE === "webkit") return webkit.launch({ headless: true });
  throw new Error(`Unknown engine ${ENGINE}`);
}

function attach(page, bucket) {
  page.on("console", (message) => {
    const entry = { type: message.type(), text: message.text() };
    if (message.type() === "error") bucket.consoleErrors.push(entry);
    else if (message.type() === "warning") bucket.consoleWarnings.push(entry);
  });
  page.on("pageerror", (error) => bucket.pageErrors.push(error?.stack ?? String(error)));
  page.on("requestfailed", (request) => bucket.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  page.on("request", (request) => {
    const url = request.url();
    if (!/^(data:|blob:)/.test(url) && !ORIGINS.some(([, origin]) => url.startsWith(origin))) {
      bucket.externalRequests.push(url);
    }
  });
}

function newBucket() {
  return { consoleErrors: [], consoleWarnings: [], pageErrors: [], failedRequests: [], externalRequests: [] };
}

async function waitForShader(page) {
  await page.waitForFunction(() => {
    const root = document.querySelector("[data-living-type]");
    return root?.getAttribute("data-renderer") === "shader" && root?.getAttribute("data-mask-state") === "ready";
  }, { timeout: 25000 });
}

async function readRoot(page) {
  return page.evaluate(() => {
    const root = document.querySelector("[data-living-type]");
    const layer = root?.querySelector('[data-ready="true"]');
    const style = layer ? getComputedStyle(layer) : null;
    const rect = root?.getBoundingClientRect();
    return {
      attrs: root ? Object.fromEntries([...root.attributes].filter((attr) => attr.name.startsWith("data-")).map((attr) => [attr.name, attr.value])) : null,
      rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      maskImage: style?.maskImage ?? null,
      opacity: style?.opacity ?? null,
      canvases: document.querySelectorAll("canvas").length,
      externalSheets: [...document.styleSheets].map((sheet) => sheet.href).filter(Boolean),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    };
  });
}

async function screenshotStage(page, name) {
  const file = path.join(EVIDENCE, ENGINE, `${name}.png`);
  await page.locator("[data-living-type]").screenshot({ path: file });
  artifacts[`${name}.png`] = path.relative(process.cwd(), file);
  return file;
}

async function screenshotPage(page, name) {
  const file = path.join(EVIDENCE, ENGINE, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  artifacts[`${name}.png`] = path.relative(process.cwd(), file);
  return file;
}

async function pngBuffer(file) {
  return decodePng(await (await import("node:fs/promises")).readFile(file));
}

function samePixels(a, b, tolerance = 1) {
  if (a.width !== b.width || a.height !== b.height) return { same: false, max: 255, changed: 1 };
  let max = 0;
  let changed = 0;
  for (let y = 0; y < a.height; y += 2) {
    for (let x = 0; x < a.width; x += 2) {
      const delta = channelDelta(pixelAt(a, x, y), pixelAt(b, x, y));
      if (delta > max) max = delta;
      if (delta > tolerance) changed += 1;
    }
  }
  return { same: max <= tolerance, max, changed: changed / Math.max(1, Math.ceil(a.height / 2) * Math.ceil(a.width / 2)) };
}

async function pause(page, paused) {
  const root = await readRoot(page);
  if ((root.attrs?.["data-paused"] === "true") === paused) return;
  await page.getByTestId("consumer-pause").click();
  await page.waitForFunction((expected) => document.querySelector("[data-living-type]")?.getAttribute("data-paused") === (expected ? "true" : "false"), paused, { timeout: 5000 });
  await page.waitForTimeout(250);
}

async function sampleFrames(page, ms = 2500) {
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

function frameStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? 0;
  return {
    samples: sorted.length,
    medianMs: Number(at(50).toFixed(2)),
    p95Ms: Number(at(95).toFixed(2)),
    p99Ms: Number(at(99).toFixed(2)),
    maxMs: Number((sorted[sorted.length - 1] ?? 0).toFixed(2)),
    over33: sorted.filter((value) => value > 33).length,
    over50: sorted.filter((value) => value > 50).length,
    over100: sorted.filter((value) => value > 100).length,
    impliedHz: Number((1000 / Math.max(0.01, at(50))).toFixed(1)),
  };
}

async function extractMaskPng(page) {
  const dataUrl = await page.evaluate(async () => {
    const layer = document.querySelector('[data-living-type] [data-ready="true"]');
    if (!layer) return null;
    const value = getComputedStyle(layer).maskImage;
    const match = value.match(/url\(["']?(blob:[^"')]+)["']?\)/);
    if (!match) return null;
    const blob = await (await fetch(match[1])).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    return canvas.toDataURL("image/png");
  });
  if (!dataUrl) return null;
  return decodePng(Buffer.from(dataUrl.split(",")[1], "base64"));
}

async function boundaryEvidence(page, name) {
  await pause(page, true);
  const stageFile = await screenshotStage(page, `${name}-boundary-on`);
  const mask = await extractMaskPng(page);
  check(`${name}: mask PNG is available for boundary sampling`, Boolean(mask));
  if (!mask) return null;
  const stage = await pngBuffer(stageFile);
  await page.evaluate(() => {
    const layer = document.querySelector('[data-living-type] [data-ready="true"]');
    if (layer) layer.style.visibility = "hidden";
  });
  const offFile = await screenshotStage(page, `${name}-boundary-off`);
  await page.evaluate(() => {
    const layer = document.querySelector('[data-living-type] [data-ready="true"]');
    if (layer) layer.style.visibility = "";
  });
  const off = await pngBuffer(offFile);

  let outsideSamples = 0;
  let outsideViolations = 0;
  let maxOutside = 0;
  let insideSamples = 0;
  let insideVisible = 0;
  for (let gy = 8; gy < stage.height - 8; gy += 8) {
    for (let gx = 8; gx < stage.width - 8; gx += 8) {
      const mx = Math.floor((gx / stage.width) * mask.width);
      const my = Math.floor((gy / stage.height) * mask.height);
      const alpha = pixelAt(mask, mx, my)[3];
      const delta = channelDelta(pixelAt(stage, gx, gy), pixelAt(off, gx, gy));
      // Erode the alpha mask by one mask pixel so antialiased glyph edges are
      // not misclassified as material spill. A fully transparent 3x3
      // neighbourhood is unambiguously outside the silhouette.
      let clear = alpha === 0;
      for (let dy = -1; dy <= 1 && clear; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (pixelAt(mask, mx + dx, my + dy)[3] !== 0) {
            clear = false;
            break;
          }
        }
      }
      if (clear) {
        outsideSamples += 1;
        if (delta > 2) outsideViolations += 1;
        maxOutside = Math.max(maxOutside, delta);
      } else if (alpha > 245) {
        insideSamples += 1;
        if (delta > 10) insideVisible += 1;
      }
    }
  }

  let minX = mask.width;
  let minY = mask.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < mask.height; y += 2) {
    for (let x = 0; x < mask.width; x += 2) {
      if (pixelAt(mask, x, y)[3] > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const bbox = {
    left: Number((minX / mask.width).toFixed(4)),
    right: Number((maxX / mask.width).toFixed(4)),
    top: Number((minY / mask.height).toFixed(4)),
    bottom: Number((maxY / mask.height).toFixed(4)),
  };
  check(`${name}: material never paints outside the alpha mask (${outsideSamples} samples)`, outsideViolations === 0, `${outsideViolations} violations, max Δ${maxOutside}`);
  check(`${name}: material is visible inside the mask (${insideSamples} samples)`, insideSamples > 0 && insideVisible / insideSamples > 0.9, `${insideVisible}/${insideSamples}`);
  check(`${name}: glyph ink is not clipped at the frame edge`, bbox.left > 0.015 && bbox.right < 0.985 && bbox.top > 0.015 && bbox.bottom < 0.985, JSON.stringify(bbox));
  return { name, outsideSamples, outsideViolations, maxOutside, insideSamples, insideVisible, bbox };
}

async function testOrigin(browser, [label, origin]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.addInitScript(initScript);
  const page = await context.newPage();
  const bucket = newBucket();
  attach(page, bucket);
  const prefix = `${ENGINE}-${label}`;
  let response = await page.goto(origin, { waitUntil: "networkidle" });
  check(`${prefix}: HTTP 200`, response?.ok() === true);
  await waitForShader(page);
  await page.waitForTimeout(350);

  let root = await readRoot(page);
  check(`${prefix}: exactly one shader canvas`, root.canvases === 1, String(root.canvases));
  check(`${prefix}: mask read from font loaded`, root.attrs?.["data-font-state"] === "loaded", JSON.stringify(root.attrs));
  check(`${prefix}: canvas letter-spacing path is used`, root.attrs?.["data-mask-engine"] === "canvas-letter-spacing", root.attrs?.["data-mask-engine"]);
  check(`${prefix}: stage fits desktop`, root.scrollWidth <= root.innerWidth, `${root.scrollWidth}/${root.innerWidth}`);
  check(`${prefix}: external font is not requested`, !bucket.externalRequests.some((url) => /\.woff2?/i.test(url)), JSON.stringify(bucket.externalRequests));

  const aria = await page.locator("[data-living-type]").ariaSnapshot();
  const wordCount = (aria.match(/NULLWORX/g) ?? []).length;
  check(`${prefix}: accessible tree contains the wordmark once`, wordCount === 1, aria);
  check(`${prefix}: accessible tree has the status once`, (aria.match(/Wordmark ready/g) ?? []).length === 1, aria);

  const sentinel = await page.locator("#sentinel").evaluate((element) => ({
    font: getComputedStyle(element).fontFamily,
    color: getComputedStyle(element).color,
  }));
  check(`${prefix}: consumer CSS is not reset`, sentinel.font.includes("Arial"), JSON.stringify(sentinel));

  await screenshotPage(page, `${prefix}-desktop`);
  await screenshotStage(page, `${prefix}-stage`);

  // Text edits.
  const canvasMark = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return null;
    canvas.dataset.g5aMarker = "initial";
    return canvas.dataset.g5aMarker;
  });
  const initial = await readRoot(page);
  await page.getByTestId("consumer-text").fill("ATLAS/01");
  const immediate = await page.evaluate(() => {
    const root = document.querySelector("[data-living-type]");
    const layer = root?.querySelector("[data-ready]");
    return {
      text: root?.getAttribute("data-text"),
      state: root?.getAttribute("data-mask-state"),
      opacity: layer ? getComputedStyle(layer).opacity : null,
      mask: layer ? getComputedStyle(layer).maskImage : null,
    };
  });
  check(`${prefix}: a new wordmark immediately enters pending state`, immediate.state === "pending", JSON.stringify(immediate));
  check(`${prefix}: the previous mask is hidden while pending`, immediate.opacity === "0" || immediate.mask === "none" || immediate.mask === "", JSON.stringify(immediate));
  await page.waitForFunction(() => {
    const root = document.querySelector("[data-living-type]");
    return root?.getAttribute("data-text") === "ATLAS/01" && root?.getAttribute("data-mask-state") === "ready";
  }, { timeout: 10000 });
  const changed = await readRoot(page);
  check(`${prefix}: text edit changes the mask identity`, changed.attrs?.["data-mask-key"] !== initial.attrs?.["data-mask-key"], `${initial.attrs?.["data-mask-key"]} -> ${changed.attrs?.["data-mask-key"]}`);
  check(`${prefix}: text edit does not remount the material`, (await page.evaluate(() => document.querySelector("canvas")?.dataset.g5aMarker)) === canvasMark);
  check(`${prefix}: text edit keeps one canvas`, changed.canvases === 1, String(changed.canvases));
  await screenshotStage(page, `${prefix}-atlas`);

  // Rapid edits with no intermediate stale-ready commit.
  await page.evaluate(async () => {
    const input = document.querySelector('[data-testid="consumer-text"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    const sequence = ["N", "NU", "NUL", "NULL", "NULLW", "NULLWO", "NULLWOR", "NULLWORX"];
    for (const value of sequence) {
      setter.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 12));
    }
  });
  const burst = await page.evaluate(() => ({
    text: document.querySelector("[data-living-type]")?.getAttribute("data-text"),
    state: document.querySelector("[data-living-type]")?.getAttribute("data-mask-state"),
    stale: window.__g5a?.staleReady ?? -1,
    canvases: document.querySelectorAll("canvas").length,
  }));
  check(`${prefix}: rapid edits land on the final text`, burst.text === "NULLWORX", JSON.stringify(burst));
  check(`${prefix}: rapid edits never expose a stale ready mask`, burst.stale === 0, JSON.stringify(burst));
  check(`${prefix}: rapid edits keep one canvas`, burst.canvases === 1, JSON.stringify(burst));
  await page.waitForFunction(() => {
    const root = document.querySelector("[data-living-type]");
    return root?.getAttribute("data-text") === "NULLWORX" && root?.getAttribute("data-mask-state") === "ready";
  }, { timeout: 10000 });

  // Many edits: the mask canvas is reused and no WebGL context is created.
  const beforeEdits = await page.evaluate(() => ({
    canvasCreates: window.__g5a.canvasCreates,
    heap: performance.memory ? performance.memory.usedJSHeapSize : null,
    contextsCreated: window.__g5a.contextsCreated,
  }));
  await page.evaluate(async () => {
    const input = document.querySelector('[data-testid="consumer-text"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    for (let index = 0; index < 30; index += 1) {
      setter.call(input, `EDIT${String(index).padStart(2, "0")}`);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 28));
    }
  });
  await page.waitForFunction(() => {
    const root = document.querySelector("[data-living-type]");
    return root?.getAttribute("data-text") === "EDIT29" && root?.getAttribute("data-mask-state") === "ready";
  }, { timeout: 10000 });
  await page.waitForTimeout(400);
  const afterEdits = await page.evaluate(() => ({
    canvasCreates: window.__g5a.canvasCreates,
    heap: performance.memory ? performance.memory.usedJSHeapSize : null,
    contextsCreated: window.__g5a.contextsCreated,
    canvases: document.querySelectorAll("canvas").length,
  }));
  check(`${prefix}: 30 rapid edits do not allocate new canvases`, afterEdits.canvasCreates - beforeEdits.canvasCreates === 0, JSON.stringify({ beforeEdits, afterEdits }));
  check(`${prefix}: 30 rapid edits do not create WebGL contexts`, afterEdits.contextsCreated === beforeEdits.contextsCreated, JSON.stringify({ beforeEdits, afterEdits }));
  check(`${prefix}: 30 rapid edits keep one shader canvas`, afterEdits.canvases === 1, JSON.stringify(afterEdits));
  if (beforeEdits.heap !== null && afterEdits.heap !== null) {
    check(`${prefix}: heap growth after 30 edits is bounded`, afterEdits.heap - beforeEdits.heap < 20 * 1024 * 1024, `${((afterEdits.heap - beforeEdits.heap) / 1024 / 1024).toFixed(2)} MiB`);
  }

  // Long valid wordmark: no clipping and a distinct key.
  const longWord = "ABCDEFGHIJKLMNOPQRSTUVWX";
  await page.getByTestId("consumer-text").fill(longWord);
  await page.waitForFunction((value) => {
    const root = document.querySelector("[data-living-type]");
    return root?.getAttribute("data-text") === value && root?.getAttribute("data-mask-state") === "ready";
  }, longWord, { timeout: 10000 });
  const longRoot = await readRoot(page);
  check(`${prefix}: 24-character wordmark validates`, longRoot.attrs?.["data-mask-state"] === "ready", JSON.stringify(longRoot.attrs));
  const longBoundary = await boundaryEvidence(page, `${prefix}-long`);
  check(`${prefix}: 24-character wordmark is not clipped`, longBoundary ? longBoundary.bbox.left > 0.015 && longBoundary.bbox.right < 0.985 : false, JSON.stringify(longBoundary?.bbox));
  await page.getByTestId("consumer-text").fill("NULLWORX");
  await page.waitForFunction(() => {
    const root = document.querySelector("[data-living-type]");
    return root?.getAttribute("data-text") === "NULLWORX" && root?.getAttribute("data-mask-state") === "ready";
  }, { timeout: 10000 });

  if (shouldRun(true)) {
    // Preset changes must not remount the material.
    const beforePreset = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (canvas) canvas.dataset.g5aPreset = "same";
      return document.querySelectorAll("canvas").length;
    });
    for (const preset of ["kiln", "low-tide", "night-bloom"]) {
      await page.getByTestId(`consumer-preset-${preset}`).click();
      await page.waitForTimeout(120);
    }
    await waitForShader(page);
    check(`${prefix}: rapid preset changes keep one canvas`, (await page.evaluate(() => document.querySelectorAll("canvas").length)) === beforePreset);
    check(`${prefix}: rapid preset changes do not replace the canvas`, (await page.evaluate(() => document.querySelector("canvas")?.dataset.g5aPreset)) === "same");

    // Paused stills are byte-stable; resume changes them.
    await pause(page, true);
    const pausedA = await screenshotStage(page, `${prefix}-paused-a`);
    await page.waitForTimeout(700);
    const pausedB = await screenshotStage(page, `${prefix}-paused-b`);
    const pausedSame = samePixels(await pngBuffer(pausedA), await pngBuffer(pausedB), 1);
    check(`${prefix}: paused composition is stable`, pausedSame.same, JSON.stringify(pausedSame));
    const rafBefore = await page.evaluate(() => window.__g5a.rafCalls);
    await page.waitForTimeout(500);
    const rafAfter = await page.evaluate(() => window.__g5a.rafCalls);
    check(`${prefix}: paused composition stops the render loop`, rafAfter - rafBefore <= 2, `${rafAfter - rafBefore} rAF calls`);

    await pause(page, false);
    await page.waitForTimeout(300);
    const resumedA = await screenshotStage(page, `${prefix}-resumed-a`);
    await page.waitForTimeout(650);
    const resumedB = await screenshotStage(page, `${prefix}-resumed-b`);
    const resumedDiff = samePixels(await pngBuffer(resumedA), await pngBuffer(resumedB), 1);
    check(`${prefix}: resuming animation changes pixels`, !resumedDiff.same, JSON.stringify(resumedDiff));
  }

  if (MODE === "full") {
    // Reduced motion follows the OS.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => {
      const root = document.querySelector("[data-living-type]");
      return root?.getAttribute("data-reduced") === "true" && root?.getAttribute("data-paused") === "true";
    }, { timeout: 5000 });
    await page.waitForTimeout(250);
    const reducedA = await screenshotStage(page, `${prefix}-reduced-a`);
    await page.waitForTimeout(650);
    const reducedB = await screenshotStage(page, `${prefix}-reduced-b`);
    const reducedSame = samePixels(await pngBuffer(reducedA), await pngBuffer(reducedB), 1);
    check(`${prefix}: OS reduced motion produces a static composition`, reducedSame.same, JSON.stringify(reducedSame));
    const reducedRafBefore = await page.evaluate(() => window.__g5a.rafCalls);
    await page.waitForTimeout(500);
    const reducedRafAfter = await page.evaluate(() => window.__g5a.rafCalls);
    check(`${prefix}: OS reduced motion stops rAF`, reducedRafAfter - reducedRafBefore <= 2, `${reducedRafAfter - reducedRafBefore} rAF calls`);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForFunction(() => document.querySelector("[data-living-type]")?.getAttribute("data-reduced") === "false", { timeout: 5000 });

    // Frame cadence in the headless virtual clock (not a display claim).
    const frames = await sampleFrames(page, 2200);
    const stats = frameStats(frames);
    check(`${prefix}: animated frame cadence recorded`, stats.samples > 30, JSON.stringify(stats));
    findings.push({ name: `${prefix}-frame-cadence`, detail: `headless virtual clock; ${JSON.stringify(stats)}` });

    // Resize and mobile screenshots.
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(350);
    await page.waitForFunction(() => document.querySelector("[data-living-type]")?.getAttribute("data-mask-state") === "ready", { timeout: 8000 });
    const tablet = await readRoot(page);
    check(`${prefix}: tablet resize re-rasterises the mask`, tablet.rect.width < 1100 && tablet.attrs?.["data-mask-state"] === "ready", JSON.stringify(tablet.rect));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    await page.waitForFunction(() => document.querySelector("[data-living-type]")?.getAttribute("data-mask-state") === "ready", { timeout: 8000 });
    const mobile = await readRoot(page);
    check(`${prefix}: mobile has no horizontal overflow`, mobile.scrollWidth <= mobile.innerWidth, `${mobile.scrollWidth}/${mobile.innerWidth}`);
    check(`${prefix}: mobile stage stays inside the viewport`, mobile.rect.width <= 390, JSON.stringify(mobile.rect));
    await screenshotPage(page, `${prefix}-mobile`);
    await screenshotStage(page, `${prefix}-mobile-stage`);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(350);
    await page.waitForFunction(() => document.querySelector("[data-living-type]")?.getAttribute("data-mask-state") === "ready", { timeout: 8000 });

    // Boundary evidence at desktop.
    const boundary = await boundaryEvidence(page, `${prefix}-desktop`);
    artifacts[`${prefix}-boundary.json`] = boundary;

    // Unsupported input is rejected, not silently sanitised or injected.
    const payload = '<img src=x onerror="alert(1)">';
    await page.getByTestId("consumer-text").fill(payload);
    await page.waitForSelector("[data-living-type-error]", { timeout: 5000 });
    check(`${prefix}: unsupported markup produces a clear recipe error`, (await page.locator("[data-living-type-error]").innerText()).includes("rejected"));
    check(`${prefix}: unsupported markup does not create an image node`, (await page.locator("[data-living-type-error] img").count()) === 0);
    await screenshotPage(page, `${prefix}-invalid`);
    await page.getByTestId("consumer-text").fill("NULLWORX");
    await waitForShader(page);

    // Mount/unmount repeated.
    await pause(page, false);
    const beforeCycles = await page.evaluate(() => ({ ...window.__g5a }));
    for (let i = 0; i < 5; i += 1) {
      await page.getByTestId("consumer-toggle-mount").click();
      await page.waitForTimeout(220);
      const unmounted = await page.evaluate(() => ({
        live: window.__g5a.contextsLive,
        canvases: document.querySelectorAll("canvas").length,
        root: Boolean(document.querySelector("[data-living-type]")),
      }));
      check(`${prefix}: unmount ${i + 1} releases the WebGL context`, unmounted.live === 0 && unmounted.canvases === 0 && !unmounted.root, JSON.stringify(unmounted));
      await page.getByTestId("consumer-toggle-mount").click();
      await waitForShader(page);
      const remounted = await page.evaluate(() => ({ live: window.__g5a.contextsLive, canvases: document.querySelectorAll("canvas").length }));
      check(`${prefix}: remount ${i + 1} restores exactly one context`, remounted.live === 1 && remounted.canvases === 1, JSON.stringify(remounted));
    }
    const afterCycles = await page.evaluate(() => ({ ...window.__g5a }));
    check(`${prefix}: repeated mount/unmount returns to one live context`, afterCycles.contextsLive === 1, `${beforeCycles.contextsLive} -> ${afterCycles.contextsLive}`);
    check(`${prefix}: shader canvas survives five cycles`, (await page.evaluate(() => document.querySelectorAll("canvas").length)) === 1);
    const heap = await page.evaluate(() => performance.memory ? performance.memory.usedJSHeapSize : null);
    findings.push({ name: `${prefix}-lifecycle`, detail: JSON.stringify({ before: { created: beforeCycles.contextsCreated, lost: beforeCycles.contextsLost, live: beforeCycles.contextsLive }, after: { created: afterCycles.contextsCreated, lost: afterCycles.contextsLost, live: afterCycles.contextsLive }, heap }) });

    // WebGL context loss and recovery.
    await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      const gl = canvas?.getContext("webgl2");
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    });
    await page.waitForFunction(() => document.querySelector("[data-living-type]")?.getAttribute("data-renderer") === "context-lost", { timeout: 8000 });
    check(`${prefix}: WebGL context loss surfaces the static fallback`, (await page.locator("[data-testid=living-type-fallback]").count()) === 1);
    const retry = page.getByRole("button", { name: "Retry renderer" });
    check(`${prefix}: context loss offers an accessible retry`, (await retry.count()) === 1);
    await screenshotStage(page, `${prefix}-context-lost`);
    await retry.click();
    await waitForShader(page);
    check(`${prefix}: retry recovers the shader`, (await readRoot(page)).canvases === 1);
  }

  check(`${prefix}: no console errors`, bucket.consoleErrors.length === 0, JSON.stringify(bucket.consoleErrors));
  check(`${prefix}: no page errors`, bucket.pageErrors.length === 0, JSON.stringify(bucket.pageErrors));
  check(`${prefix}: no failed requests`, bucket.failedRequests.length === 0, JSON.stringify(bucket.failedRequests));
  check(`${prefix}: no external requests`, bucket.externalRequests.length === 0, JSON.stringify(bucket.externalRequests));
  if (bucket.consoleWarnings.length) {
    finding(`${prefix}-console-warnings`, JSON.stringify(bucket.consoleWarnings));
  }
  await context.close();
}

async function testNoWebgl(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(initScript);
  await context.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
      if (/webgl/i.test(String(type))) return null;
      return original.call(this, type, ...args);
    };
  });
  const page = await context.newPage();
  const bucket = newBucket();
  attach(page, bucket);
  const response = await page.goto(ORIGINS[0][1], { waitUntil: "networkidle" });
  check("no-webgl: page still loads", response?.ok() === true);
  await page.waitForFunction(() => document.querySelector("[data-living-type]")?.getAttribute("data-renderer") === "static-fallback", { timeout: 10000 });
  const root = await readRoot(page);
  check("no-webgl: no canvas is mounted", root.canvases === 0, String(root.canvases));
  const fallbackText = await page.locator("[data-testid=living-type-fallback]").innerText();
  check("no-webgl: readable static fallback is visible", fallbackText.includes("NULLWORX") && fallbackText.toLowerCase().includes("webgl2"), fallbackText);
  const aria = await page.locator("[data-living-type]").ariaSnapshot();
  check("no-webgl: accessible wordmark remains", (aria.match(/NULLWORX/g) ?? []).length === 1, aria);
  await screenshotStage(page, "chromium-no-webgl");
  check("no-webgl: no page errors", bucket.pageErrors.length === 0, JSON.stringify(bucket.pageErrors));
  await context.close();
}

async function testNoMaskSupport(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(initScript);
  await context.addInitScript(() => {
    const original = CSS.supports.bind(CSS);
    CSS.supports = (property, value) => (/mask/i.test(String(property)) ? false : original(property, value));
  });
  const page = await context.newPage();
  const bucket = newBucket();
  attach(page, bucket);
  const response = await page.goto(ORIGINS[0][1], { waitUntil: "networkidle" });
  check("no-css-mask: page still loads", response?.ok() === true);
  await page.waitForFunction(() => document.querySelector("[data-living-type]")?.getAttribute("data-renderer") === "mask-unsupported", { timeout: 10000 });
  const root = await readRoot(page);
  check("no-css-mask: no shader canvas is mounted", root.canvases === 0, String(root.canvases));
  const fallbackText = await page.locator("[data-testid=living-type-fallback]").innerText();
  check("no-css-mask: static fallback explains the missing feature", fallbackText.includes("NULLWORX") && fallbackText.toLowerCase().includes("css mask"), fallbackText);
  await screenshotStage(page, "chromium-no-css-mask");
  check("no-css-mask: no page errors", bucket.pageErrors.length === 0, JSON.stringify(bucket.pageErrors));
  await context.close();
}

async function testFontFallback() {
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: [...GPU_ARGS, "--disable-remote-fonts"],
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const bucket = newBucket();
    attach(page, bucket);
    await page.goto(ORIGINS[0][1], { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector("[data-living-type]")?.getAttribute("data-font-state") === "fallback", { timeout: 10000 });
    await waitForShader(page);
    const root = await readRoot(page);
    check("font-failure: declared fallback is used without blocking the effect", root.attrs?.["data-font-state"] === "fallback" && root.attrs?.["data-mask-state"] === "ready");
    await screenshotStage(page, "chromium-font-fallback");
    check("font-failure: no page errors", bucket.pageErrors.length === 0, JSON.stringify(bucket.pageErrors));
    await context.close();
  } finally {
    await browser.close();
  }
}

const browser = await launch();
try {
  for (const origin of ORIGINS) {
    await testOrigin(browser, origin);
  }
  if (ENGINE === "chromium" && MODE === "full") {
    await testNoWebgl(browser);
    await testNoMaskSupport(browser);
    await testFontFallback();
  }
} finally {
  await browser.close();
}

const summary = {
  generatedAt: new Date().toISOString(),
  engine: ENGINE,
  mode: MODE,
  checks: checks.length,
  failures: failures.length,
  passed: failures.length === 0,
  failureDetails: failures,
  findings,
  artifacts,
};
await writeFile(path.join(EVIDENCE, `${ENGINE}-${MODE}.json`), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify({ engine: ENGINE, mode: MODE, checks: checks.length, failures: failures.length, passed: summary.passed, failureDetails: failures, findings }, null, 2));
if (failures.length) process.exitCode = 1;
