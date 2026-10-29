#!/usr/bin/env node
/**
 * G3-A.1 real-GPU evidence capture.
 *
 * Produces, against the production build:
 *  - 2x stills for A-D at 1440x900 and 390x844
 *  - mask-edge crops on the dark stage and on an evidence-only light surface
 *  - short motion clips as PNG frame sequences (+ timing sidecars)
 *  - pointer-interaction receipts where the material implements it
 *  - frame-time distributions for all four presets, paused/animated/reduced
 *  - WebGL context lifecycle over repeated mask switches and mount/unmount
 *  - heap / DOM / GPU info receipts
 *
 * Capture cadence and display cadence are measured separately and written to
 * timing.json. Nothing here claims that screenshot cadence equals display fps.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const ORIGIN = process.env.ORIGIN ?? "http://127.0.0.1:3100";
const EVIDENCE = path.resolve(process.env.EVIDENCE_DIR ?? "evidence/g3a1/gpu");
const SHOTS = path.join(EVIDENCE, "stills");
const EDGES = path.join(EVIDENCE, "edges");
const MOTION = path.join(EVIDENCE, "motion");
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const GPU_ARGS = [
  "--use-gl=angle",
  "--use-angle=gl",
  "--ignore-gpu-blocklist",
  "--disable-gpu-driver-bug-workarounds",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
];

const INIT = () => {
  window.__gl = { created: 0, lost: 0, live: 0 };
  const live = new WeakSet();
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
    const context = original.call(this, type, ...args);
    if (context && /webgl/i.test(String(type))) {
      window.__gl.created += 1;
      window.__gl.live += 1;
      live.add(context);
    }
    return context;
  };
  for (const Constructor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!Constructor) continue;
    const getExtension = Constructor.prototype.getExtension;
    Constructor.prototype.getExtension = function (name) {
      if (String(name).toLowerCase() === "webgl_lose_context" && live.has(this)) {
        live.delete(this);
        window.__gl.lost += 1;
        window.__gl.live = Math.max(0, window.__gl.live - 1);
      }
      return getExtension.call(this, name);
    };
  }
  window.__frames = [];
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    const start = performance.now();
    return raf((time) => {
      window.__frames.push(Number((performance.now() - start).toFixed(3)));
      callback(time);
    });
  };
};

const config = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
const receipts = { generatedAt: null, renderer: null, stills: [], edges: [], clips: [], pointer: null, frames: {}, lifecycle: {}, heap: null, gpu: null, dom: null, console: { errors: [], warnings: [], pageErrors: [] } };

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: GPU_ARGS, timeout: 60000 });
const context = await browser.newContext({ viewport: config.viewport, deviceScaleFactor: config.deviceScaleFactor, reducedMotion: "no-preference" });
await context.addInitScript(INIT);
const page = await context.newPage();
page.on("console", (message) => {
  if (message.type() === "error") receipts.console.errors.push(message.text());
  else if (message.type() === "warning") receipts.console.warnings.push(message.text());
});
page.on("pageerror", (error) => receipts.console.pageErrors.push(error?.stack ?? String(error)));

await mkdir(SHOTS, { recursive: true });
await mkdir(EDGES, { recursive: true });
await mkdir(MOTION, { recursive: true });

async function gotoLab() {
  await page.goto(`${ORIGIN}/labs/composition`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector('[data-testid="composition-lab"]');
  await page.waitForTimeout(300);
}

async function waitPreset(letter) {
  const surface = letter === "a" || letter === "c" ? "holotype" : "paper";
  await page.waitForFunction((name) => document.querySelector("[data-surface]")?.getAttribute("data-surface") === name, surface);
  if (surface === "paper") {
    await page.waitForFunction(() => {
      const element = document.querySelector('[data-surface="paper"]');
      return element?.getAttribute("data-mask-ready") === "true" && Boolean(element.querySelector("canvas"));
    });
  }
  await page.waitForFunction(() => {
    const image = document.querySelector('[data-testid="mask-reference"]');
    return Boolean(image && image.complete && image.naturalWidth > 0);
  });
  await page.waitForTimeout(500);
}

async function select(letter) {
  await page.locator(`[data-testid="preset-${letter}"]`).click();
  await waitPreset(letter);
}

async function toggle(label, wanted) {
  const input = page.getByLabel(label, { exact: true });
  if ((await input.isChecked()) !== wanted) await input.click();
  await page.waitForTimeout(300);
}

async function rendererInfo() {
  return page.evaluate(() => {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    if (!gl) return { webgl2: false };
    const extension = gl.getExtension("WEBGL_debug_renderer_info");
    const result = {
      webgl2: true,
      vendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
    };
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return result;
  });
}

async function stageBox() {
  return page.locator('[data-testid="composition-stage-inner"]').boundingBox();
}

await gotoLab();
const cdp = await context.newCDPSession(page);
receipts.renderer = await rendererInfo();
try {
  const info = await cdp.send("SystemInfo.getInfo");
  receipts.gpu = {
    devices: info.gpu.devices,
    driverBugWorkarounds: info.gpu.driverBugWorkarounds,
    featureStatus: info.gpu.featureStatus,
    auxAttributes: {
      glRenderer: info.gpu.auxAttributes?.glRenderer,
      glVendor: info.gpu.auxAttributes?.glVendor,
      glVersion: info.gpu.auxAttributes?.glVersion,
      displayType: info.gpu.auxAttributes?.displayType,
    },
  };
} catch (error) {
  receipts.gpu = { error: String(error) };
}

const maskMapFor = async () =>
  page.evaluate(async () => {
    const image = document.querySelector('[data-testid="mask-reference"]');
    await image.decode();
    const width = 480;
    const height = Math.round((width * image.naturalHeight) / image.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);
    const data = ctx.getImageData(0, 0, width, height).data;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (data[(y * width + x) * 4 + 3] > 32) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    return { width, height, bbox: { minX: minX / (width - 1), minY: minY / (height - 1), maxX: maxX / (width - 1), maxY: maxY / (height - 1) } };
  });

// ---------- 1. Hi-res stills ----------
for (const viewport of [
  { name: "desktop-1440x900", size: { width: 1440, height: 900 }, dpr: 2 },
  { name: "mobile-390x844", size: { width: 390, height: 844 }, dpr: 2 },
]) {
  await page.setViewportSize(viewport.size);
  await page.waitForTimeout(400);
  for (const letter of ["a", "b", "c", "d"]) {
    await select(letter);
    await toggle("Pause material", true);
    const file = path.join(SHOTS, `composition-${letter}-${viewport.name}@${viewport.dpr}x.png`);
    await page.locator('[data-testid="composition-stage-inner"]').screenshot({ path: file });
    receipts.stills.push({ letter, viewport: viewport.name, dpr: viewport.dpr, path: path.relative(EVIDENCE, file), box: await stageBox() });
    await toggle("Pause material", false);
  }
}
await page.setViewportSize(config.viewport);
await page.waitForTimeout(400);

// ---------- 2. Edge crops ----------
async function edgeCrop(letter, surface, file, light) {
  await select(letter);
  await toggle("Pause material", true);
  let lightStyle = null;
  if (light) {
    lightStyle = await page.addStyleTag({
      content: '[data-testid="composition-stage-inner"]{background:#f2efe4 !important;}',
    });
    await page.waitForTimeout(250);
  }
  const map = await maskMapFor();
  const box = await stageBox();
  // Crop around the left ink edge at mid-height; for the wordmark this is the
  // N stem, for the moth the left forewing. 96x96 CSS px at DPR2.
  const size = 96;
  const cx = Math.max(size / 2, Math.min(box.width - size / 2, map.bbox.minX * box.width + 6));
  const cy = Math.max(size / 2, Math.min(box.height - size / 2, (map.bbox.minY + map.bbox.maxY) / 2 * box.height));
  const clip = { x: box.x + cx - size / 2, y: box.y + cy - size / 2, width: size, height: size };
  await page.screenshot({ path: file, clip });
  receipts.edges.push({ letter, surface, light: Boolean(light), path: path.relative(EVIDENCE, file), clip, bbox: map.bbox });
  if (lightStyle) {
    await lightStyle.evaluate((element) => element.remove());
    await page.waitForTimeout(150);
  }
  await toggle("Pause material", false);
}

for (const letter of ["a", "b", "c", "d"]) {
  const surface = letter === "a" || letter === "c" ? "holotype" : "paper";
  await edgeCrop(letter, surface, path.join(EDGES, `${letter}-${surface}-edge-dark@2x.png`), false);
  await edgeCrop(letter, surface, path.join(EDGES, `${letter}-${surface}-edge-light@2x.png`), true);
}

// ---------- 3. Motion clips ----------
async function captureClip(name, letter, { intervalMs = 100, frames = 40, pointerPath = null } = {}) {
  const dir = path.join(MOTION, name);
  await mkdir(dir, { recursive: true });
  await select(letter);
  await toggle("Pause material", false);
  await page.waitForTimeout(400);
  const box = await stageBox();
  await page.evaluate(() => {
    window.__frames.length = 0;
  });
  const started = Date.now();
  const timestamps = [];
  for (let index = 0; index < frames; index += 1) {
    const target = started + index * intervalMs;
    if (pointerPath) {
      const progress = index / (frames - 1);
      const x = pointerPath.x0 + (pointerPath.x1 - pointerPath.x0) * progress;
      const y = pointerPath.y0 + (pointerPath.y1 - pointerPath.y0) * progress;
      await page.mouse.move(x, y);
    }
    await page.locator('[data-testid="composition-stage-inner"]').screenshot({ path: path.join(dir, `frame-${String(index).padStart(4, "0")}.png`) });
    timestamps.push(Date.now() - started);
    const wait = target + intervalMs - Date.now();
    if (wait > 0) await page.waitForTimeout(wait);
  }
  const display = await page.evaluate(() => {
    const values = window.__frames.slice();
    const sorted = [...values].sort((a, b) => a - b);
    const pick = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? null;
    return {
      samples: values.length,
      medianMs: pick(0.5),
      p95Ms: pick(0.95),
      maxMs: sorted[sorted.length - 1] ?? null,
      over50ms: values.filter((value) => value > 50).length,
    };
  });
  const actual = timestamps.slice(1).map((value, index) => value - timestamps[index]);
  const sorted = [...actual].sort((a, b) => a - b);
  const timing = {
    name,
    preset: letter,
    requestedIntervalMs: intervalMs,
    requestedFps: 1000 / intervalMs,
    frames: timestamps.length,
    durationMs: timestamps[timestamps.length - 1],
    capture: {
      minMs: sorted[0] ?? null,
      medianMs: sorted[Math.floor(sorted.length / 2)] ?? null,
      maxMs: sorted[sorted.length - 1] ?? null,
      effectiveFps: Number(((timestamps.length - 1) / ((timestamps[timestamps.length - 1] - timestamps[0]) / 1000)).toFixed(2)),
      note: "Playwright element-screenshot cadence. This is the capture cadence, not the browser display cadence.",
    },
    display: { ...display, note: "requestAnimationFrame deltas observed in the page while capturing." },
    stageBox: box,
    pointer: Boolean(pointerPath),
  };
  await writeFile(path.join(dir, "timing.json"), JSON.stringify(timing, null, 2) + "\n");
  receipts.clips.push({ ...timing, dir: path.relative(EVIDENCE, dir) });
  await toggle("Pause material", true);
  await toggle("Pause material", false);
  return timing;
}

for (const letter of ["a", "b", "c", "d"]) {
  await captureClip(`${letter}-desktop`, letter, { frames: 36, intervalMs: 100 });
}

// Pointer clip: HoloType advertises pointer input; drive a real mouse path.
const boxForPointer = await stageBox();
await captureClip("a-pointer", "a", {
  frames: 30,
  intervalMs: 100,
  pointerPath: {
    x0: boxForPointer.x + boxForPointer.width * 0.15,
    y0: boxForPointer.y + boxForPointer.height * 0.2,
    x1: boxForPointer.x + boxForPointer.width * 0.85,
    y1: boxForPointer.y + boxForPointer.height * 0.8,
  },
});

// ---------- 4. Frame-time distributions (all four, paused + animated + reduced) ----------
async function measure(durationMs = 2200) {
  return page.evaluate(
    (ms) =>
      new Promise((resolve) => {
        const start = performance.now();
        const deltas = [];
        let last = start;
        const tick = (time) => {
          deltas.push(time - last);
          last = time;
          if (time - start < ms) requestAnimationFrame(tick);
          else resolve(deltas);
        };
        requestAnimationFrame(tick);
      }),
    durationMs,
  );
}

function summarize(deltas) {
  const sorted = [...deltas].sort((a, b) => a - b);
  const pick = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? null;
  return {
    samples: deltas.length,
    medianMs: Number(pick(0.5).toFixed(2)),
    p95Ms: Number(pick(0.95).toFixed(2)),
    p99Ms: Number(pick(0.99).toFixed(2)),
    maxMs: Number(sorted[sorted.length - 1].toFixed(2)),
    over33ms: deltas.filter((value) => value > 33.4).length,
    over50ms: deltas.filter((value) => value > 50).length,
    over100ms: deltas.filter((value) => value > 100).length,
  };
}

for (const viewport of [
  { name: "desktop-1440x900", size: { width: 1440, height: 900 } },
  { name: "mobile-390x844", size: { width: 390, height: 844 } },
]) {
  await page.setViewportSize(viewport.size);
  await page.waitForTimeout(400);
  for (const letter of ["a", "b", "c", "d"]) {
    await select(letter);
    for (const mode of ["animated", "paused"]) {
      await toggle("Pause material", mode === "paused");
      await page.waitForTimeout(900);
      const deltas = await measure();
      receipts.frames[`${letter}-${viewport.name}-${mode}`] = summarize(deltas);
    }
    await toggle("Pause material", false);
  }
}
await page.setViewportSize(config.viewport);

// reduced motion: separate context with the media query forced
const reducedContext = await browser.newContext({ viewport: config.viewport, deviceScaleFactor: 1, reducedMotion: "reduce" });
await reducedContext.addInitScript(INIT);
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(`${ORIGIN}/labs/composition`, { waitUntil: "networkidle" });
await reducedPage.waitForSelector('[data-testid="composition-lab"]');
for (const letter of ["a", "b", "c", "d"]) {
  await reducedPage.locator(`[data-testid="preset-${letter}"]`).click();
  await reducedPage.waitForTimeout(1000);
  const deltas = await reducedPage.evaluate(
    () =>
      new Promise((resolve) => {
        const start = performance.now();
        const values = [];
        let last = start;
        const tick = (time) => {
          values.push(time - last);
          last = time;
          if (time - start < 1500) requestAnimationFrame(tick);
          else resolve(values);
        };
        requestAnimationFrame(tick);
      }),
  );
  const raf = await reducedPage.evaluate(() => document.querySelectorAll("[data-holo-text],[data-holo-glyph]").length);
  receipts.frames[`${letter}-desktop-1440x900-reduced`] = { ...summarize(deltas), holoNodes: raf };
}
await reducedContext.close();

// ---------- 5. Context lifecycle: repeated mask switches with Paper mounted ----------
await select("b");
const beforeSwitch = await page.evaluate(() => {
  window.__canvas = document.querySelector('[data-surface="paper"] canvas');
  return { ...window.__gl };
});
for (let round = 0; round < 10; round += 1) {
  await page.locator('[data-testid="preset-d"]').click();
  await page.waitForTimeout(250);
  await page.locator('[data-testid="preset-b"]').click();
  await page.waitForTimeout(250);
}
const afterSwitch = await page.evaluate(() => ({ ...window.__gl, canvases: document.querySelectorAll("canvas").length }));
const sameCanvas = await page.evaluate(
  () => Boolean(window.__canvas) && window.__canvas === document.querySelector('[data-surface="paper"] canvas'),
);
receipts.lifecycle.maskSwitch = { beforeSwitch, afterSwitch, sameCanvas };

await page.locator('a[aria-label="Nullworx UI Forge gallery"]').click();
await page.waitForURL(`${ORIGIN}/`, { timeout: 20000 });
await page.waitForTimeout(700);
const afterLeave = await page.evaluate(() => ({ ...window.__gl, canvases: document.querySelectorAll("canvas").length }));
receipts.lifecycle.unmount = afterLeave;
await page.goBack({ waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="composition-lab"]');
await select("b");
receipts.lifecycle.remount = await page.evaluate(() => ({ ...window.__gl, canvases: document.querySelectorAll("canvas").length }));

// ---------- 6. Heap / DOM / node counts ----------
await cdp.send("Runtime.enable");
const heapBefore = await cdp.send("Runtime.getHeapUsage");
const domBefore = await page.evaluate(() => ({ nodes: document.getElementsByTagName("*").length, canvases: document.querySelectorAll("canvas").length }));
for (let cycle = 0; cycle < 5; cycle += 1) {
  for (const letter of ["a", "b", "c", "d"]) await select(letter);
}
await page.waitForTimeout(1000);
const heapAfter = await cdp.send("Runtime.getHeapUsage");
const domAfter = await page.evaluate(() => ({ nodes: document.getElementsByTagName("*").length, canvases: document.querySelectorAll("canvas").length }));
receipts.heap = {
  before: heapBefore.usedSize,
  after: heapAfter.usedSize,
  deltaBytes: heapAfter.usedSize - heapBefore.usedSize,
  cycles: 5,
};
receipts.dom = { before: domBefore, after: domAfter, gl: await page.evaluate(() => ({ ...window.__gl })) };
receipts.generatedAt = new Date().toISOString();
receipts.userAgent = await page.evaluate(() => navigator.userAgent);
receipts.devicePixelRatio = await page.evaluate(() => window.devicePixelRatio);

await writeFile(path.join(EVIDENCE, "receipts.json"), JSON.stringify(receipts, null, 2) + "\n");
console.log(JSON.stringify({ renderer: receipts.renderer, clips: receipts.clips.length, stills: receipts.stills.length, edges: receipts.edges.length, frames: Object.keys(receipts.frames).length, lifecycle: receipts.lifecycle, heap: receipts.heap, dom: receipts.dom, consoleErrors: receipts.console.errors.length }, null, 2));
await browser.close();
