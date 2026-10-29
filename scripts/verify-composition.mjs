#!/usr/bin/env node
/**
 * G3-A browser evidence harness.
 *
 * Run against a production build:
 *   pnpm start --hostname 127.0.0.1 --port 3100
 *   EVIDENCE_DIR=evidence/g3a pnpm verify:composition
 *
 * Uses the system Chrome through playwright-core; no browser download.
 *
 * The boundary check does not rely on screenshot similarity. For each
 * combination it pauses the material, captures the stage, hides the material
 * surface, captures the empty stage, and compares the two images against the
 * canonical mask alpha. That separates "material inside the mask" from
 * "material outside the mask" without assuming the material's colours.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import { channelDelta, decodePng, pixelAt } from "./lib/png.mjs";

const ORIGIN = process.env.ORIGIN ?? "http://127.0.0.1:3100";
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const EVIDENCE = path.resolve(process.env.EVIDENCE_DIR ?? "evidence/g3a");
const SHOTS = path.join(EVIDENCE, "screenshots");
const CHECKS = path.join(EVIDENCE, "checks");
const PERF_SAMPLE_MS = Number(process.env.PERF_SAMPLE_MS ?? 2200);
const PERF_WARMUP_MS = Number(process.env.PERF_WARMUP_MS ?? 1200);

const results = [];
const findings = [];
const screenshots = [];
const diagnostics = [];
const boundaryResults = [];
let failures = 0;

function finding(id, detail) {
  findings.push({ id, detail });
  console.log(`FINDING  ${id} — ${detail}`);
}

function check(id, condition, detail = "") {
  const pass = Boolean(condition);
  results.push({ id, pass, detail });
  if (!pass) failures += 1;
  console.log(`${pass ? "PASS" : "FAIL"}  ${id}${detail ? ` — ${detail}` : ""}`);
  return pass;
}

async function scenario(name, fn) {
  try {
    await fn();
  } catch (error) {
    failures += 1;
    results.push({
      id: `${name} / uncaught`,
      pass: false,
      detail: error instanceof Error ? (error.stack ?? error.message) : String(error),
    });
    console.error(`FAIL  ${name} / uncaught — ${error?.stack ?? error}`);
  }
}

const INIT_SCRIPT = () => {
  window.__gl = { created: 0, lost: 0, live: 0 };
  const liveContexts = new WeakSet();
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
    const context = originalGetContext.call(this, type, ...args);
    if (context && /webgl/i.test(String(type))) {
      window.__gl.created += 1;
      window.__gl.live += 1;
      liveContexts.add(context);
    }
    return context;
  };
  for (const Constructor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!Constructor) continue;
    const original = Constructor.prototype.getExtension;
    Constructor.prototype.getExtension = function getExtension(name) {
      if (String(name).toLowerCase() === "webgl_lose_context" && liveContexts.has(this)) {
        liveContexts.delete(this);
        window.__gl.lost += 1;
        window.__gl.live = Math.max(0, window.__gl.live - 1);
      }
      return original.call(this, name);
    };
  }
  window.__rafActive = new Set();
  const raf = window.requestAnimationFrame.bind(window);
  const caf = window.cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = (callback) => {
    let id = 0;
    id = raf((time) => {
      window.__rafActive.delete(id);
      callback(time);
    });
    window.__rafActive.add(id);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    window.__rafActive.delete(id);
    caf(id);
  };
};

const CAPTURE_WARNING = /GL Driver Message|ReadPixels|software WebGL|SwiftShader/i;

function attachDiagnostics(page, bucket) {
  page.on("console", (message) => {
    const entry = { type: message.type(), text: message.text() };
    if (message.type() === "error") bucket.consoleErrors.push(entry);
    else if (message.type() === "warning") {
      if (CAPTURE_WARNING.test(message.text())) bucket.captureWarnings.push(entry);
      else bucket.consoleWarnings.push(entry);
    }
  });
  page.on("pageerror", (error) => {
    bucket.pageErrors.push(error?.stack ?? String(error));
  });
  page.on("requestfailed", (request) => {
    bucket.requestFailures.push({
      url: request.url(),
      failure: request.failure()?.errorText ?? "unknown",
    });
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      bucket.httpErrors.push({ url: response.url(), status: response.status() });
    }
  });
  page.on("request", (request) => {
    const url = request.url();
    if (url.startsWith("data:") || url.startsWith("blob:")) return;
    if (!url.startsWith(ORIGIN)) bucket.externalRequests.push(url);
  });
}

async function createPage(browser, options) {
  const context = await browser.newContext({
    viewport: options.viewport,
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
    isMobile: options.isMobile ?? false,
    hasTouch: options.hasTouch ?? false,
    reducedMotion: options.reducedMotion ?? "no-preference",
    colorScheme: "dark",
  });
  await context.addInitScript(INIT_SCRIPT);
  const page = await context.newPage();
  const bucket = {
    label: options.label,
    consoleErrors: [],
    consoleWarnings: [],
    captureWarnings: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
    externalRequests: [],
    viewport: options.viewport,
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
  };
  attachDiagnostics(page, bucket);
  diagnostics.push(bucket);
  return { context, page, bucket };
}

async function gotoLab(page) {
  await page.goto(`${ORIGIN}/labs/composition`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="composition-lab"]');
  await page.waitForSelector('[data-testid="composition-stage-inner"]');
  await waitForMask(page);
}

async function waitForMask(page) {
  await page.waitForFunction(
    () => {
      const image = document.querySelector('[data-testid="mask-reference"]');
      return Boolean(image && image.complete && image.naturalWidth > 0);
    },
    undefined,
    { timeout: 20000 },
  );
}

const SURFACE_FOR_PRESET = { a: "holotype", b: "paper", c: "holotype", d: "paper" };

async function waitForSurface(page, expected) {
  await page.waitForFunction(
    (surface) => document.querySelector("[data-surface]")?.getAttribute("data-surface") === surface,
    expected,
    { timeout: 20000 },
  );
  if (expected === "paper") {
    await page.waitForFunction(
      () => {
        const surface = document.querySelector('[data-surface="paper"]');
        return (
          surface?.getAttribute("data-mask-ready") === "true" &&
          Boolean(surface.querySelector("canvas"))
        );
      },
      undefined,
      { timeout: 20000 },
    );
  } else {
    await page.waitForFunction(
      () => Boolean(document.querySelector("[data-holo-text], [data-holo-glyph]")),
      undefined,
      { timeout: 20000 },
    );
  }
  await waitForMask(page);
  await page.waitForTimeout(350);
}

async function selectPreset(page, letter) {
  await page.locator(`[data-testid="preset-${letter}"]`).click();
  await waitForSurface(page, SURFACE_FOR_PRESET[letter]);
}

async function setToggle(page, label, wanted) {
  const input = page.getByLabel(label, { exact: true });
  const checked = await input.isChecked();
  if (checked !== wanted) await input.click();
  await page.waitForTimeout(250);
}

async function readState(page) {
  return page.evaluate(() => {
    const lab = document.querySelector('[data-testid="composition-lab"]');
    const stage = document.querySelector('[data-testid="composition-stage"]');
    const surface = document.querySelector("[data-surface]");
    const mask = document.querySelector('[data-testid="mask-reference"]');
    const shader = document.querySelector("div[data-paper-shader]");
    return {
      lab: lab ? { ...lab.dataset } : null,
      stage: stage ? { ...stage.dataset } : null,
      surface: surface ? { ...surface.dataset } : null,
      mask: mask
        ? {
            width: mask.naturalWidth,
            height: mask.naturalHeight,
            ...mask.dataset,
          }
        : null,
      paperSpeed: shader?.paperShaderMount?.speed ?? null,
      canvases: document.querySelectorAll("canvas").length,
      holoText: document.querySelectorAll("[data-holo-text]").length,
      holoGlyph: document.querySelectorAll("[data-holo-glyph]").length,
      runningAnimations: document
        .getAnimations()
        .filter((animation) => animation.playState === "running").length,
      gl: window.__gl,
      rafActive: window.__rafActive.size,
      domNodes: document.getElementsByTagName("*").length,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      stageBox: (() => {
        const element = document.querySelector('[data-testid="composition-stage-inner"]');
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      })(),
    };
  });
}

const MAX_WIDTH = 480;

async function readMaskMap(page) {
  return page.evaluate(async (maxWidth) => {
    const image = document.querySelector('[data-testid="mask-reference"]');
    if (!image) return null;
    await image.decode();
    const width = Math.min(maxWidth, image.naturalWidth);
    const height = Math.max(1, Math.round((width * image.naturalHeight) / image.naturalWidth));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height).data;
    const alpha = new Uint8Array(width * height);
    for (let index = 0; index < alpha.length; index += 1) alpha[index] = data[index * 4 + 3];

    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    let count = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (alpha[y * width + x] > 16) {
          count += 1;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    const centerY = Math.round((minY + maxY) / 2);
    let runs = 0;
    let inside = false;
    for (let x = 0; x < width; x += 1) {
      const filled = alpha[centerY * width + x] > 128;
      if (filled && !inside) runs += 1;
      inside = filled;
    }

    return {
      width,
      height,
      alpha: Array.from(alpha),
      bbox:
        maxX < 0
          ? null
          : {
              minX: minX / (width - 1),
              minY: minY / (height - 1),
              maxX: maxX / (width - 1),
              maxY: maxY / (height - 1),
            },
      coverage: count / (width * height),
      corners: [
        alpha[0],
        alpha[width - 1],
        alpha[(height - 1) * width],
        alpha[height * width - 1],
      ],
      centerRowRuns: runs,
    };
  }, MAX_WIDTH);
}

function maskAlphaAt(map, x, y) {
  const px = Math.max(0, Math.min(map.width - 1, Math.round(x)));
  const py = Math.max(0, Math.min(map.height - 1, Math.round(y)));
  return map.alpha[py * map.width + px];
}

function allNeighbours(map, x, y, radius, predicate) {
  const px = Math.max(0, Math.min(map.width - 1, Math.round(x)));
  const py = Math.max(0, Math.min(map.height - 1, Math.round(y)));
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const nx = Math.max(0, Math.min(map.width - 1, px + dx));
      const ny = Math.max(0, Math.min(map.height - 1, py + dy));
      if (!predicate(map.alpha[ny * map.width + nx])) return false;
    }
  }
  return true;
}

function maskSamples(map, radius = 2) {
  const inside = [];
  const outside = [];
  for (let gy = 0.02; gy <= 0.981; gy += 0.035) {
    for (let gx = 0.02; gx <= 0.981; gx += 0.035) {
      const x = gx * (map.width - 1);
      const y = gy * (map.height - 1);
      const alpha = maskAlphaAt(map, x, y);
      if (alpha >= 250 && allNeighbours(map, x, y, radius, (value) => value >= 250)) {
        inside.push([gx, gy]);
      } else if (alpha === 0 && allNeighbours(map, x, y, radius, (value) => value === 0)) {
        outside.push([gx, gy]);
      }
    }
  }
  const spread = (list, max) => {
    if (list.length <= max) return list;
    const step = Math.ceil(list.length / max);
    return list.filter((_, index) => index % step === 0).slice(0, max);
  };
  return { inside: spread(inside, 80), outside: spread(outside, 80) };
}

async function captureStage(page) {
  const stage = page.locator('[data-testid="composition-stage-inner"]');
  await stage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  return stage.screenshot();
}

async function setSurfaceHidden(page, hidden) {
  await page.evaluate((value) => {
    const surface = document.querySelector("[data-surface]");
    if (!surface) return;
    if (value) {
      surface.dataset.evidenceHidden = "true";
      surface.style.visibility = "hidden";
    } else {
      delete surface.dataset.evidenceHidden;
      surface.style.visibility = "";
    }
  }, hidden);
}

function contentBBox(withImage, emptyImage, threshold) {
  let minX = withImage.width;
  let minY = withImage.height;
  let maxX = -1;
  let maxY = -1;
  const step = 2;
  for (let y = 2; y < withImage.height - 2; y += step) {
    for (let x = 2; x < withImage.width - 2; x += step) {
      const delta = channelDelta(pixelAt(withImage, x, y), pixelAt(emptyImage, x, y));
      if (delta > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return {
    minX: minX / (withImage.width - 1),
    minY: minY / (withImage.height - 1),
    maxX: maxX / (withImage.width - 1),
    maxY: maxY / (withImage.height - 1),
  };
}

async function analyzeBoundary(page, letter, maskMap, surface) {
  const samples = maskSamples(maskMap);
  if (samples.inside.length < 6 || samples.outside.length < 6) {
    return { ok: false, reason: "insufficient samples", samples };
  }

  const withBuffer = await captureStage(page);
  await setSurfaceHidden(page, true);
  let emptyBuffer;
  try {
    emptyBuffer = await captureStage(page);
  } finally {
    await setSurfaceHidden(page, false);
  }

  const withImage = decodePng(withBuffer);
  const emptyImage = decodePng(emptyBuffer);
  if (withImage.width !== emptyImage.width || withImage.height !== emptyImage.height) {
    return { ok: false, reason: "stage size changed between captures" };
  }

  const insideDeltas = samples.inside.map(([nx, ny]) => {
    const x = nx * (withImage.width - 1);
    const y = ny * (withImage.height - 1);
    return channelDelta(pixelAt(withImage, x, y), pixelAt(emptyImage, x, y));
  });
  const outsideDeltas = samples.outside.map(([nx, ny]) => {
    const x = nx * (withImage.width - 1);
    const y = ny * (withImage.height - 1);
    return channelDelta(pixelAt(withImage, x, y), pixelAt(emptyImage, x, y));
  });

  const visibleInside = insideDeltas.filter((delta) => delta > 10).length;
  const insideCoverage = visibleInside / insideDeltas.length;
  const meanInside = insideDeltas.reduce((sum, value) => sum + value, 0) / insideDeltas.length;
  const outsideLimit = surface === "paper" ? 3 : 9;
  const maxOutside = Math.max(...outsideDeltas);
  const outsideViolations = outsideDeltas.filter((delta) => delta > outsideLimit).length;
  const content = contentBBox(withImage, emptyImage, 10);

  return {
    ok: true,
    letter,
    surface,
    stage: { width: withImage.width, height: withImage.height },
    sampleCounts: { inside: samples.inside.length, outside: samples.outside.length },
    insideCoverage,
    meanInside: Number(meanInside.toFixed(2)),
    outsideLimit,
    maxOutside,
    outsideViolations,
    maskBBox: maskMap.bbox,
    contentBBox: content,
    bboxTolerance: surface === "paper" ? { x: 0.02, y: 0.025 } : { x: 0.045, y: 0.06 },
  };
}

function hashes(buffer) {
  return {
    sha256: createHash("sha256").update(buffer).digest("hex"),
    bytes: buffer.length,
  };
}

async function shot(page, name, meta, fullPage = false) {
  const file = path.join(SHOTS, `${name}.png`);
  const buffer = await page.screenshot({ path: file, fullPage, animations: "disabled" });
  screenshots.push({ name, file: path.relative(EVIDENCE, file), fullPage, ...hashes(buffer), ...meta });
  console.log(`SHOT  ${name} (${page.viewportSize()?.width ?? "?"}×${page.viewportSize()?.height ?? "?"}${fullPage ? " full page" : ""})`);
}

async function stageShot(page, name, meta) {
  const stage = page.locator('[data-testid="composition-stage-inner"]');
  const buffer = await stage.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  screenshots.push({ name, file: path.relative(EVIDENCE, `screenshots/${name}.png`), element: true, ...hashes(buffer), ...meta });
  console.log(`SHOT  ${name} (stage)`);
}

async function measureFrames(page, durationMs) {
  return page.evaluate(async (duration) => {
    return new Promise((resolve) => {
      const deltas = [];
      let start = 0;
      let previous = 0;
      const tick = (time) => {
        if (start === 0) {
          start = time;
          previous = time;
          requestAnimationFrame(tick);
          return;
        }
        deltas.push(time - previous);
        previous = time;
        if (time - start < duration) requestAnimationFrame(tick);
        else resolve({ deltas, wallMs: time - start });
      };
      requestAnimationFrame(tick);
    });
  }, durationMs);
}

function summarizeFrames(sample) {
  const deltas = [...sample.deltas].sort((a, b) => a - b);
  if (deltas.length === 0) {
    return { frames: 0, wallMs: sample.wallMs, fps: 0 };
  }
  const percentile = (p) => deltas[Math.min(deltas.length - 1, Math.floor(p * deltas.length))];
  const median = percentile(0.5);
  const wallSeconds = sample.wallMs / 1000;
  return {
    frames: deltas.length,
    wallMs: Number(sample.wallMs.toFixed(1)),
    fps: Number((deltas.length / wallSeconds).toFixed(2)),
    medianMs: Number(median.toFixed(2)),
    p95Ms: Number(percentile(0.95).toFixed(2)),
    maxMs: Number(deltas[deltas.length - 1].toFixed(2)),
    longFrames50ms: deltas.filter((delta) => delta > 50).length,
    longFrames100ms: deltas.filter((delta) => delta > 100).length,
  };
}

const startedAt = Date.now();
await mkdir(SHOTS, { recursive: true });
await mkdir(CHECKS, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
});

try {
  await scenario("ssr and noindex", async () => {
    const response = await fetch(`${ORIGIN}/labs/composition`);
    const html = await response.text();
    check("composition route is HTTP 200", response.ok, String(response.status));
    check("composition route is noindex", /<meta[^>]+name="robots"[^>]+noindex/i.test(html) || /noindex/i.test(html));
    check("SSR HTML contains no canvas", !/<canvas/i.test(html));
    check("SSR HTML contains the lab shell", html.includes("Two masks"));
  });

  await scenario("desktop 1440x900", async () => {
    const desktop = await createPage(browser, {
      label: "desktop-1440x900",
      viewport: { width: 1440, height: 900 },
    });
    const page = desktop.page;
    await gotoLab(page);

    check("desktop: no horizontal overflow", (await readState(page)).scrollWidth <= 1441);
    check("desktop: no hydration errors", !desktop.bucket.consoleErrors.some((entry) => /hydrat|did not match|server rendered/i.test(entry.text)));

    for (const letter of ["a", "b", "c", "d"]) {
      await selectPreset(page, letter);
      await setToggle(page, "Pause material", true);
      const state = await readState(page);
      const surface = SURFACE_FOR_PRESET[letter];
      const expectedKind = letter === "a" || letter === "b" ? "svg-path" : "text";

      check(`${letter}: material surface is ${surface}`, state.surface?.surface === surface, JSON.stringify(state.surface));
      check(`${letter}: mask kind is ${expectedKind}`, state.surface?.maskKind === expectedKind);
      check(`${letter}: canonical mask reference is present`, state.mask && state.mask.width > 0 && state.mask.height > 0);
      check(
        `${letter}: material is not blank`,
        surface === "paper" ? state.canvases > 0 : state.holoText + state.holoGlyph > 0,
        JSON.stringify({ canvases: state.canvases, holoText: state.holoText, holoGlyph: state.holoGlyph }),
      );
      check(`${letter}: stage aspect ratio matches the mask`, state.stageBox && Math.abs(state.stageBox.width / state.stageBox.height - (expectedKind === "svg-path" ? 400 / 260 : 5)) < 0.02, JSON.stringify(state.stageBox));

      const maskMap = await readMaskMap(page);
      check(`${letter}: mask is non-blank and has transparent corners`, maskMap && maskMap.coverage > 0.08 && maskMap.coverage < 0.9 && maskMap.corners.every((value) => value === 0), JSON.stringify({ coverage: maskMap?.coverage, corners: maskMap?.corners }));
      if (expectedKind === "text") {
        check(`${letter}: text mask has at least eight letter runs`, (maskMap?.centerRowRuns ?? 0) >= 8, String(maskMap?.centerRowRuns));
      }

      const boundary = await analyzeBoundary(page, letter, maskMap, surface);
      boundaryResults.push(boundary);
      check(`${letter}: boundary analysis completed`, boundary.ok, boundary.reason ?? "");
      if (boundary.ok) {
        check(`${letter}: material is visible inside the mask`, boundary.insideCoverage >= 0.85, `coverage=${boundary.insideCoverage.toFixed(3)} meanDelta=${boundary.meanInside}`);
        check(`${letter}: no material outside the mask`, boundary.outsideViolations === 0, `violations=${boundary.outsideViolations} maxDelta=${boundary.maxOutside} limit=${boundary.outsideLimit}`);
        const maskBox = boundary.maskBBox;
        const contentBox = boundary.contentBBox;
        const tolerance = boundary.bboxTolerance;
        const aligned =
          maskBox &&
          contentBox &&
          Math.abs(maskBox.minX - contentBox.minX) <= tolerance.x &&
          Math.abs(maskBox.maxX - contentBox.maxX) <= tolerance.x &&
          Math.abs(maskBox.minY - contentBox.minY) <= tolerance.y &&
          Math.abs(maskBox.maxY - contentBox.maxY) <= tolerance.y;
        check(`${letter}: content bounding box aligns with the mask`, aligned, JSON.stringify({ maskBox, contentBox, tolerance }));
      }

      await stageShot(page, `composition-${letter}-desktop-1440x900`, { preset: letter, surface, maskKind: expectedKind, paused: true });
    }

    await selectPreset(page, "c");
    await setToggle(page, "Pause material", false);
    await page.waitForTimeout(500);
    await shot(page, "lab-composition-wordmark-desktop-1440x900", { preset: "c" }, true);

    await selectPreset(page, "a");
    await setToggle(page, "Pause material", false);
    await shot(page, "lab-composition-desktop-1440x900", { preset: "a" }, true);

    check("desktop: no console errors", desktop.bucket.consoleErrors.length === 0, JSON.stringify(desktop.bucket.consoleErrors.slice(0, 5)));
    check("desktop: no page errors", desktop.bucket.pageErrors.length === 0, JSON.stringify(desktop.bucket.pageErrors.slice(0, 3)));
    check("desktop: no failed requests", desktop.bucket.requestFailures.length === 0, JSON.stringify(desktop.bucket.requestFailures.slice(0, 5)));
    check("desktop: no external requests", desktop.bucket.externalRequests.length === 0, JSON.stringify(desktop.bucket.externalRequests.slice(0, 5)));
    check("desktop: no HTTP errors", desktop.bucket.httpErrors.length === 0, JSON.stringify(desktop.bucket.httpErrors.slice(0, 5)));
    await desktop.context.close();
  });

  await scenario("mobile 390x844", async () => {
    const mobile = await createPage(browser, {
      label: "mobile-390x844",
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = mobile.page;
    await gotoLab(page);

    check("mobile: no horizontal overflow", (await readState(page)).scrollWidth <= 391, String((await readState(page)).scrollWidth));
    const controls = await page.locator("button").evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      }),
    );
    check("mobile: controls fit the viewport", controls.every((box) => box.left >= -1 && box.right <= 391 && box.width > 0), JSON.stringify(controls.slice(0, 4)));

    for (const letter of ["a", "b", "c", "d"]) {
      await selectPreset(page, letter);
      await setToggle(page, "Pause material", true);
      const state = await readState(page);
      const surface = SURFACE_FOR_PRESET[letter];
      check(`mobile ${letter}: surface is ${surface}`, state.surface?.surface === surface);
      check(`mobile ${letter}: no horizontal overflow`, state.scrollWidth <= 391, String(state.scrollWidth));
      await stageShot(page, `composition-${letter}-mobile-390x844`, { preset: letter, surface, paused: true, deviceScaleFactor: 2 });

      if (letter === "b" || letter === "d") {
        const maskMap = await readMaskMap(page);
        const boundary = await analyzeBoundary(page, `mobile-${letter}`, maskMap, surface);
        boundaryResults.push(boundary);
        check(`mobile ${letter}: boundary analysis completed`, boundary.ok, boundary.reason ?? "");
        if (boundary.ok) {
          check(`mobile ${letter}: material is visible inside the mask`, boundary.insideCoverage >= 0.85, `coverage=${boundary.insideCoverage.toFixed(3)}`);
          check(`mobile ${letter}: no material outside the mask`, boundary.outsideViolations === 0, `violations=${boundary.outsideViolations} maxDelta=${boundary.maxOutside}`);
        }
      }
    }

    await selectPreset(page, "a");
    await setToggle(page, "Pause material", false);
    await shot(page, "lab-composition-mobile-390x844", { preset: "a", deviceScaleFactor: 2 }, true);
    check("mobile: no console errors", mobile.bucket.consoleErrors.length === 0, JSON.stringify(mobile.bucket.consoleErrors.slice(0, 5)));
    check("mobile: no page errors", mobile.bucket.pageErrors.length === 0);
    check("mobile: no failed requests", mobile.bucket.requestFailures.length === 0);
    await mobile.context.close();
  });

  await scenario("reduced motion and pause", async () => {
    const reduced = await createPage(browser, {
      label: "reduced-motion",
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const page = reduced.page;
    await gotoLab(page);
    await selectPreset(page, "b");
    await page.waitForTimeout(600);
    let state = await readState(page);
    check("reduced motion: lab reports reduced", state.lab?.reduced === "true");
    check("reduced motion: Paper reports reduced", state.surface?.reduced === "true");
    check("reduced motion: Paper shader speed is zero", state.paperSpeed === 0, String(state.paperSpeed));
    check("reduced motion: no active animation frames", state.rafActive <= 1, String(state.rafActive));
    await stageShot(page, "composition-b-reduced-motion-1440x900", { preset: "b", reducedMotion: true });

    await selectPreset(page, "a");
    state = await readState(page);
    check("reduced motion: HoloType reports reduced", state.surface?.reduced === "true");
    check("reduced motion: HoloType is static", state.surface?.animated === "false");
    check("reduced motion: no running CSS animations", state.runningAnimations === 0, String(state.runningAnimations));

    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(500);
    state = await readState(page);
    check("reduced motion off: lab follows the live media query", state.lab?.reduced === "false");
    await selectPreset(page, "b");
    await page.waitForTimeout(700);
    state = await readState(page);
    check("reduced motion off: Paper resumes", state.paperSpeed > 0, String(state.paperSpeed));
    check("reduced motion off: animation frames resume", state.rafActive > 0, String(state.rafActive));

    await selectPreset(page, "a");
    await setToggle(page, "Pause material", true);
    state = await readState(page);
    check("pause: HoloType is static", state.surface?.animated === "false");
    check("pause: no running HoloType animations", state.runningAnimations === 0, String(state.runningAnimations));
    await setToggle(page, "Pause material", false);
    await page.waitForTimeout(500);
    state = await readState(page);
    check("resume: HoloType is animated", state.surface?.animated === "true");
    check("resume: HoloType animations run", state.runningAnimations > 0, String(state.runningAnimations));

    check("reduced motion: no console errors", reduced.bucket.consoleErrors.length === 0, JSON.stringify(reduced.bucket.consoleErrors.slice(0, 5)));
    check("reduced motion: no page errors", reduced.bucket.pageErrors.length === 0);
    await reduced.context.close();
  });

  await scenario("repeated switching", async () => {
    const repeated = await createPage(browser, {
      label: "repeated-switching",
      viewport: { width: 1440, height: 900 },
    });
    const page = repeated.page;
    await gotoLab(page);
    const before = await readState(page);
    let maxLive = 0;

    // A mask change must not remount the material. With Paper mounted, capture
    // the exact canvas element and the context counter, switch only the mask,
    // then prove the element and context survived.
    await selectPreset(page, "b");
    const paperBefore = await page.evaluate(() => {
      const canvas = document.querySelector('[data-surface="paper"] canvas');
      window.__evidenceCanvas = canvas;
      return { created: window.__gl.created, live: window.__gl.live };
    });
    await page.getByRole("button", { name: "Wordmark", exact: true }).click();
    await waitForSurface(page, "paper");
    const paperAfter = await page.evaluate(() => {
      const canvas = document.querySelector('[data-surface="paper"] canvas');
      return {
        sameCanvas: canvas === window.__evidenceCanvas,
        created: window.__gl.created,
        live: window.__gl.live,
      };
    });
    check("mask-only switch keeps the Paper canvas mounted", paperAfter.sameCanvas === true, JSON.stringify(paperAfter));
    check("mask-only switch creates no additional WebGL context", paperAfter.created === paperBefore.created, JSON.stringify({ before: paperBefore, after: paperAfter }));
    await page.getByRole("button", { name: "Moth", exact: true }).click();
    await waitForSurface(page, "paper");

    for (let cycle = 0; cycle < 5; cycle += 1) {
      for (const letter of ["a", "b", "c", "d"]) {
        await selectPreset(page, letter);
        const state = await readState(page);
        const surface = SURFACE_FOR_PRESET[letter];
        check(`switch ${cycle + 1}${letter}: ${surface} mounted`, state.surface?.surface === surface);
        maxLive = Math.max(maxLive, state.gl.live);
      }
    }

    await selectPreset(page, "a");
    await page.waitForTimeout(600);
    const after = await readState(page);
    check("switching: at most one live WebGL context at a time", maxLive <= 1, String(maxLive));
    check("switching: no live WebGL context after returning to HoloType", after.gl.live === 0, JSON.stringify(after.gl));
    check("switching: no persistent shader animation frames", after.rafActive <= 1, String(after.rafActive));
    check("switching: DOM node count is bounded", after.domNodes - before.domNodes < 60, `${before.domNodes} -> ${after.domNodes}`);
    check("switching: no console errors", repeated.bucket.consoleErrors.length === 0, JSON.stringify(repeated.bucket.consoleErrors.slice(0, 5)));
    await repeated.context.close();
  });

  await scenario("mount, unmount and navigation", async () => {
    const nav = await createPage(browser, {
      label: "navigation",
      viewport: { width: 1440, height: 900 },
    });
    const page = nav.page;
    await gotoLab(page);

    for (let cycle = 0; cycle < 5; cycle += 1) {
      await selectPreset(page, "d");
      const mounted = await readState(page);
      check(`mount ${cycle + 1}: Paper canvas is mounted`, mounted.canvases > 0 && mounted.gl.live === 1, JSON.stringify({ canvases: mounted.canvases, gl: mounted.gl }));

      await page.goto(`${ORIGIN}/labs/effects`, { waitUntil: "networkidle" });
      await page.waitForTimeout(500);
      const left = await page.evaluate(() => ({
        canvases: document.querySelectorAll("canvas").length,
        gl: window.__gl,
        rafActive: window.__rafActive.size,
      }));
      check(`unmount ${cycle + 1}: no canvas remains on the effects lab`, left.canvases === 0, String(left.canvases));
      check(`unmount ${cycle + 1}: no live WebGL context remains`, left.gl.live === 0, JSON.stringify(left.gl));

      await page.goto(`${ORIGIN}/labs/composition`, { waitUntil: "networkidle" });
      await waitForSurface(page, "holotype");
    }

    await selectPreset(page, "d");
    await page.getByRole("link", { name: /UI Forge gallery/i }).first().click();
    await page.waitForURL(`${ORIGIN}/`);
    await page.goBack();
    await waitForSurface(page, "holotype");
    check("navigation: client-side round trip returns to the lab", page.url().includes("/labs/composition"));
    check("navigation: no console errors", nav.bucket.consoleErrors.length === 0, JSON.stringify(nav.bucket.consoleErrors.slice(0, 5)));
    await nav.context.close();
  });

  await scenario("resize", async () => {
    const resize = await createPage(browser, {
      label: "resize",
      viewport: { width: 1440, height: 900 },
    });
    const page = resize.page;
    await gotoLab(page);
    await selectPreset(page, "d");
    await setToggle(page, "Pause material", true);

    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
      { width: 1440, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      const state = await readState(page);
      check(`resize ${viewport.width}x${viewport.height}: no horizontal overflow`, state.scrollWidth <= viewport.width + 1, String(state.scrollWidth));
      check(`resize ${viewport.width}x${viewport.height}: stage keeps the mask aspect`, state.stageBox && Math.abs(state.stageBox.width / state.stageBox.height - 5) < 0.05, JSON.stringify(state.stageBox));
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);
    const maskMap = await readMaskMap(page);
    const boundary = await analyzeBoundary(page, "resize-mobile-d", maskMap, "paper");
    boundaryResults.push(boundary);
    check("resize: boundary still aligns after resizing", boundary.ok && boundary.insideCoverage >= 0.85 && boundary.outsideViolations === 0, JSON.stringify(boundary));
    check("resize: no console errors", resize.bucket.consoleErrors.length === 0, JSON.stringify(resize.bucket.consoleErrors.slice(0, 5)));
    await resize.context.close();
  });

  await scenario("performance and resources", async () => {
    const perf = await createPage(browser, {
      label: "performance",
      viewport: { width: 1440, height: 900 },
    });
    const page = perf.page;
    await gotoLab(page);

    const renderer = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2");
      if (!context) return null;
      const extension = context.getExtension("WEBGL_debug_renderer_info");
      const result = {
        vendor: extension ? context.getParameter(extension.UNMASKED_VENDOR_WEBGL) : null,
        renderer: extension ? context.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null,
        version: context.getParameter(context.VERSION),
      };
      context.getExtension("WEBGL_lose_context")?.loseContext();
      return result;
    });

    const rounds = [];
    for (let round = 0; round < 3; round += 1) {
      const order = round % 2 === 0 ? ["a", "b"] : ["b", "a"];
      const roundResult = {};
      for (const letter of order) {
        await selectPreset(page, letter);
        await setToggle(page, "Pause material", false);
        await page.waitForTimeout(PERF_WARMUP_MS);
        const sample = await measureFrames(page, PERF_SAMPLE_MS);
        roundResult[letter] = summarizeFrames(sample);
      }
      rounds.push(roundResult);
    }

    const medianOf = (values) => {
      const sorted = [...values].sort((a, b) => a - b);
      return sorted[Math.floor(sorted.length / 2)];
    };
    const aggregate = (letter) => {
      const entries = rounds.map((round) => round[letter]);
      return {
        fps: medianOf(entries.map((entry) => entry.fps)),
        medianMs: medianOf(entries.map((entry) => entry.medianMs)),
        p95Ms: medianOf(entries.map((entry) => entry.p95Ms)),
        maxMs: Math.max(...entries.map((entry) => entry.maxMs)),
        longFrames50ms: Math.max(...entries.map((entry) => entry.longFrames50ms)),
        rounds: entries,
      };
    };
    const holotype = aggregate("a");
    const paper = aggregate("b");
    check("performance: HoloType sampled", holotype.rounds.every((entry) => entry.frames > 0));
    check("performance: Paper sampled", paper.rounds.every((entry) => entry.frames > 0));

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Runtime.enable");
    const heapBefore = await cdp.send("Runtime.getHeapUsage");
    for (let cycle = 0; cycle < 5; cycle += 1) {
      for (const letter of ["a", "b", "c", "d"]) await selectPreset(page, letter);
    }
    await selectPreset(page, "a");
    await page.waitForTimeout(800);
    const heapAfter = await cdp.send("Runtime.getHeapUsage");
    await cdp.send("Performance.enable");
    const metrics = await cdp.send("Performance.getMetrics");

    const manifest = JSON.parse(await readFile(".next/app-build-manifest.json", "utf8"));
    const shared = manifest.pages["/layout"] ?? [];
    const bundleFor = async (route) => {
      const files = new Set([...(manifest.pages[route] ?? []), ...shared]);
      let js = 0;
      let css = 0;
      for (const file of files) {
        const size = (await stat(path.join(".next", file))).size;
        if (file.endsWith(".css")) css += size;
        else js += size;
      }
      return { files: files.size, jsBytes: js, cssBytes: css, totalBytes: js + css };
    };
    const bundles = {
      home: await bundleFor("/page"),
      effects: await bundleFor("/labs/effects/page"),
      composition: await bundleFor("/labs/composition/page"),
    };

    const performance = {
      generatedAt: new Date().toISOString(),
      method:
        "Chromium headless, production build, 1440x900 DPR1, alternating A/B rounds, PERF_WARMUP_MS warmup + PERF_SAMPLE_MS rAF cadence per round, median of per-round medians.",
      warmupMs: PERF_WARMUP_MS,
      sampleMs: PERF_SAMPLE_MS,
      renderer,
      userAgent: await page.evaluate(() => navigator.userAgent),
      devicePixelRatio: await page.evaluate(() => window.devicePixelRatio),
      viewport: { width: 1440, height: 900 },
      holotype,
      paper,
      heap: {
        before: { usedSize: heapBefore.usedSize, totalSize: heapBefore.totalSize },
        after: { usedSize: heapAfter.usedSize, totalSize: heapAfter.totalSize },
        deltaBytes: heapAfter.usedSize - heapBefore.usedSize,
        cycles: 5,
      },
      performanceMetrics: Object.fromEntries(metrics.metrics.map((metric) => [metric.name, metric.value])),
      bundles,
      bundleDelta: {
        compositionMinusEffectsBytes: bundles.composition.totalBytes - bundles.effects.totalBytes,
        compositionMinusHomeBytes: bundles.composition.totalBytes - bundles.home.totalBytes,
      },
    };
    await writeFile(path.join(EVIDENCE, "performance.json"), JSON.stringify(performance, null, 2) + "\n");

    finding(
      "software-or-unknown-webgl",
      `WebGL renderer reported as ${renderer?.renderer ?? "unknown"} (${renderer?.vendor ?? "unknown"}). No GPU-backed 60 fps claim is made.`,
    );
    check("performance: HoloType median frame time recorded", holotype.medianMs > 0, String(holotype.medianMs));
    check("performance: Paper median frame time recorded", paper.medianMs > 0, String(paper.medianMs));
    check("performance: heap growth is bounded after five switch cycles", heapAfter.usedSize - heapBefore.usedSize < 40 * 1024 * 1024, `${((heapAfter.usedSize - heapBefore.usedSize) / 1024 / 1024).toFixed(2)} MiB`);
    check("performance: composition bundle is recorded", bundles.composition.totalBytes > 0, JSON.stringify(bundles.composition));
    check("performance: no console errors", perf.bucket.consoleErrors.length === 0, JSON.stringify(perf.bucket.consoleErrors.slice(0, 5)));
    await perf.context.close();
  });
} finally {
  await browser.close();
}

const warnings = diagnostics.flatMap((bucket) =>
  bucket.consoleWarnings.map((warning) => ({ bucket: bucket.label, ...warning })),
);
const captureWarnings = diagnostics.flatMap((bucket) =>
  bucket.captureWarnings.map((warning) => ({ bucket: bucket.label, ...warning })),
);

check("console warnings are understood", warnings.length === 0, JSON.stringify(warnings.slice(0, 8)));
if (captureWarnings.length > 0) {
  finding(
    "capture-induced-webgl-warnings",
    `${captureWarnings.length} WebGL driver performance messages were emitted by the software renderer during screenshots; they are not application warnings and are recorded under checks/console-network.json.`,
  );
}

check("boundary evidence covers all four combinations", new Set(boundaryResults.filter((entry) => entry.ok).map((entry) => entry.letter)).size >= 4, JSON.stringify(boundaryResults.map((entry) => entry.letter)));

const summary = {
  generatedAt: new Date().toISOString(),
  durationMs: Date.now() - startedAt,
  origin: ORIGIN,
  browser: `Google Chrome via playwright-core (${CHROME})`,
  passed: results.filter((entry) => entry.pass).length,
  failed: failures,
  checks: results,
  findings,
  screenshots,
  boundary: boundaryResults,
  diagnostics,
};

await writeFile(path.join(EVIDENCE, "verify.json"), JSON.stringify(summary, null, 2) + "\n");
await writeFile(path.join(CHECKS, "console-network.json"), JSON.stringify({ diagnostics, captureWarnings }, null, 2) + "\n");
await writeFile(path.join(SHOTS, "manifest.json"), JSON.stringify(screenshots, null, 2) + "\n");

console.log(`\n${summary.passed}/${summary.passed + summary.failed} composition checks passed; ${summary.failed} failed.`);
console.log(`Evidence: ${EVIDENCE}`);
if (summary.failed > 0) process.exitCode = 1;
