#!/usr/bin/env node
/**
 * G3-A.1 cross-browser acceptance harness.
 *
 * Runs the same production build and the same four composition presets in
 * Chromium (system Chrome, real GPU), Firefox (Playwright build) and WebKit
 * (Playwright WebKitGTK build). It does not substitute an effect when a browser
 * cannot run one: a missing WebGL2 must surface the lab's explicit fallback.
 *
 *   node scripts/g3a1/verify-crossbrowser.mjs
 *
 * Evidence: evidence/g3a1/cross-browser/<engine>/
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, firefox, webkit } from "playwright-core";
import { channelDelta, decodePng, pixelAt } from "../lib/png.mjs";

const ORIGIN = process.env.ORIGIN ?? "http://127.0.0.1:3100";
const EVIDENCE = path.resolve(process.env.EVIDENCE_DIR ?? "evidence/g3a1/cross-browser");
const SHOTS = path.join(EVIDENCE, "screenshots");
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const GPU_ARGS = [
  "--use-gl=angle",
  "--use-angle=gl",
  "--ignore-gpu-blocklist",
  "--disable-gpu-driver-bug-workarounds",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
];
const ONLY = process.env.ENGINES ? process.env.ENGINES.split(",").map((value) => value.trim()) : null;

const SURFACE_FOR_PRESET = { a: "holotype", b: "paper", c: "holotype", d: "paper" };
const MASK_KIND_FOR_PRESET = { a: "svg-path", b: "svg-path", c: "text", d: "text" };
const MAX_WIDTH = 480;

const INIT_SCRIPT = () => {
  window.__gl = { created: 0, lost: 0, live: 0 };
  const live = new WeakSet();
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
    const context = originalGetContext.call(this, type, ...args);
    if (context && /webgl/i.test(String(type))) {
      window.__gl.created += 1;
      window.__gl.live += 1;
      live.add(context);
    }
    return context;
  };
  for (const Constructor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!Constructor) continue;
    const original = Constructor.prototype.getExtension;
    Constructor.prototype.getExtension = function getExtension(name) {
      if (String(name).toLowerCase() === "webgl_lose_context" && live.has(this)) {
        live.delete(this);
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

function makeBucket() {
  return { consoleErrors: [], consoleWarnings: [], pageErrors: [], failedRequests: [], externalRequests: [] };
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
    if (!request.url().startsWith(ORIGIN) && !request.url().startsWith("data:") && !request.url().startsWith("blob:")) {
      bucket.externalRequests.push(request.url());
    }
  });
}

async function newPage(context, bucket) {
  await context.addInitScript(INIT_SCRIPT);
  const page = await context.newPage();
  attach(page, bucket);
  return page;
}

async function gotoLab(page) {
  await page.goto(`${ORIGIN}/labs/composition`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForSelector('[data-testid="composition-lab"]', { timeout: 20000 });
  await page.waitForTimeout(300);
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

async function waitForSurface(page, expected) {
  await page.waitForFunction(
    (surface) => document.querySelector("[data-surface]")?.getAttribute("data-surface") === surface,
    expected,
    { timeout: 25000 },
  );
  if (expected === "paper") {
    await page.waitForFunction(
      () => {
        const surface = document.querySelector('[data-surface="paper"]');
        if (surface?.getAttribute("data-webgl") === "unsupported") return true;
        return surface?.getAttribute("data-mask-ready") === "true" && Boolean(surface.querySelector("canvas"));
      },
      undefined,
      { timeout: 25000 },
    );
  } else {
    await page.waitForFunction(
      () => Boolean(document.querySelector("[data-holo-text], [data-holo-glyph]")),
      undefined,
      { timeout: 25000 },
    );
  }
  await waitForMask(page);
  await page.waitForTimeout(400);
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
    const surface = document.querySelector("[data-surface]");
    const mask = document.querySelector('[data-testid="mask-reference"]');
    const shader = document.querySelector("div[data-paper-shader]");
    const stage = document.querySelector('[data-testid="composition-stage-inner"]');
    const rect = stage?.getBoundingClientRect();
    return {
      lab: lab ? { ...lab.dataset } : null,
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
      fallback: document.querySelector('[data-testid="webgl-fallback"]')?.textContent ?? null,
      surfaceError: document.querySelector('[data-testid="surface-error"]')?.textContent ?? null,
      gl: { ...window.__gl },
      rafActive: window.__rafActive.size,
      runningAnimations: document.getAnimations().filter((animation) => animation.playState === "running").length,
      domNodes: document.getElementsByTagName("*").length,
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      stageBox: rect ? { width: rect.width, height: rect.height } : null,
      fontState: document.querySelector('[data-testid="font-state"]')?.textContent ?? null,
      maskSource: document.querySelector('[data-testid="mask-source"]')?.textContent ?? null,
      compatibility: document.querySelector('[data-testid="compatibility"]')?.textContent ?? null,
      effectiveState: document.querySelector('[data-testid="effective-state"]')?.textContent ?? null,
    };
  });
}

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
    return {
      width,
      height,
      alpha: Array.from(alpha),
      bbox:
        maxX < 0
          ? null
          : { minX: minX / (width - 1), minY: minY / (height - 1), maxX: maxX / (width - 1), maxY: maxY / (height - 1) },
      coverage: count / (width * height),
      corners: [alpha[0], alpha[width - 1], alpha[(height - 1) * width], alpha[height * width - 1]],
      intrinsic: { width: image.naturalWidth, height: image.naturalHeight },
      kind: image.dataset.maskKind,
      source: image.dataset.maskSource,
      fontFamily: image.dataset.fontFamily,
      fontLoaded: image.dataset.fontLoaded,
    };
  }, MAX_WIDTH);
}

function alphaAt(map, x, y) {
  const px = Math.max(0, Math.min(map.width - 1, Math.round(x)));
  const py = Math.max(0, Math.min(map.height - 1, Math.round(y)));
  return map.alpha[py * map.width + px];
}

function neighbours(map, x, y, radius, predicate) {
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

function samples(map, radius = 2) {
  const inside = [];
  const outside = [];
  for (let gy = 0.02; gy <= 0.981; gy += 0.035) {
    for (let gx = 0.02; gx <= 0.981; gx += 0.035) {
      const x = gx * (map.width - 1);
      const y = gy * (map.height - 1);
      const alpha = alphaAt(map, x, y);
      if (alpha >= 250 && neighbours(map, x, y, radius, (value) => value >= 250)) inside.push([gx, gy]);
      else if (alpha === 0 && neighbours(map, x, y, radius, (value) => value === 0)) outside.push([gx, gy]);
    }
  }
  const spread = (list, max) => {
    if (list.length <= max) return list;
    const step = Math.ceil(list.length / max);
    return list.filter((_, index) => index % step === 0).slice(0, max);
  };
  return { inside: spread(inside, 80), outside: spread(outside, 80) };
}

async function stageShot(page) {
  const stage = page.locator('[data-testid="composition-stage-inner"]');
  await stage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  return stage.screenshot();
}

async function setSurfaceHidden(page, hidden) {
  await page.evaluate((value) => {
    const surface = document.querySelector("[data-surface]");
    if (!surface) return;
    if (value) surface.style.visibility = "hidden";
    else surface.style.visibility = "";
  }, hidden);
}

function bboxOf(withImage, emptyImage, threshold = 14) {
  let minX = withImage.width;
  let minY = withImage.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 2; y < withImage.height - 2; y += 2) {
    for (let x = 2; x < withImage.width - 2; x += 2) {
      if (channelDelta(pixelAt(withImage, x, y), pixelAt(emptyImage, x, y)) > threshold) {
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

/**
 * Boundary check without assuming material colours: capture the stage, hide the
 * material surface, capture the flat stage, then compare at mask inside/outside
 * samples. Same method as the G3-A harness.
 */
async function boundary(page, letter, maskMap, tolerance = 9) {
  const list = samples(maskMap);
  if (list.inside.length < 6 || list.outside.length < 6) {
    return { ok: false, reason: "insufficient mask samples", samples: { inside: list.inside.length, outside: list.outside.length } };
  }
  const withImage = decodePng(await stageShot(page));
  await setSurfaceHidden(page, true);
  await page.waitForTimeout(180);
  const emptyImage = decodePng(await stageShot(page));
  await setSurfaceHidden(page, false);
  await page.waitForTimeout(120);

  let insideVisible = 0;
  let insideDelta = 0;
  let outsideViolations = 0;
  let maxOutside = 0;
  for (const [gx, gy] of list.inside) {
    const x = Math.round(gx * (withImage.width - 1));
    const y = Math.round(gy * (withImage.height - 1));
    const delta = channelDelta(pixelAt(withImage, x, y), pixelAt(emptyImage, x, y));
    insideDelta += delta;
    if (delta > 12) insideVisible += 1;
  }
  for (const [gx, gy] of list.outside) {
    const x = Math.round(gx * (withImage.width - 1));
    const y = Math.round(gy * (withImage.height - 1));
    const delta = channelDelta(pixelAt(withImage, x, y), pixelAt(emptyImage, x, y));
    maxOutside = Math.max(maxOutside, delta);
    if (delta > tolerance) outsideViolations += 1;
  }
  const content = bboxOf(withImage, emptyImage);
  const yDelta = content && maskMap.bbox ? Math.abs(content.minY - maskMap.bbox.minY) + Math.abs(content.maxY - maskMap.bbox.maxY) : null;
  const xDelta = content && maskMap.bbox ? Math.abs(content.minX - maskMap.bbox.minX) + Math.abs(content.maxX - maskMap.bbox.maxX) : null;
  return {
    ok: true,
    samples: { inside: list.inside.length, outside: list.outside.length },
    insideCoverage: insideVisible / list.inside.length,
    meanInsideDelta: insideDelta / list.inside.length,
    outsideViolations,
    maxOutsideDelta: maxOutside,
    tolerance,
    contentBBox: content,
    maskBBox: maskMap.bbox,
    bboxDelta: { x: xDelta, y: yDelta },
  };
}

async function cssCapabilities(page) {
  return page.evaluate(() => {
    const el = document.querySelector('[data-surface="paper"]')?.querySelector("div");
    const computed = el ? getComputedStyle(el) : null;
    const supports = (property, value) => (typeof CSS?.supports === "function" ? CSS.supports(property, value) : null);
    return {
      maskImageSupported: supports("mask-image", 'url("data:image/svg+xml,%3Csvg/%3E")'),
      maskModeSupported: supports("mask-mode", "alpha"),
      webkitMaskImageSupported: supports("-webkit-mask-image", 'url("data:image/svg+xml,%3Csvg/%3E")'),
      computed: computed
        ? {
            maskImage: computed.maskImage ?? computed.getPropertyValue("mask-image"),
            webkitMaskImage: computed.getPropertyValue("-webkit-mask-image"),
            maskMode: computed.maskMode ?? computed.getPropertyValue("mask-mode"),
            maskSize: computed.maskSize ?? computed.getPropertyValue("mask-size"),
            maskRepeat: computed.maskRepeat ?? computed.getPropertyValue("mask-repeat"),
            maskPosition: computed.maskPosition ?? computed.getPropertyValue("mask-position"),
          }
        : null,
    };
  });
}

async function webgl(page) {
  return page.evaluate(() => {
    const output = { webgl2: false, renderer: null, vendor: null, version: null, error: null };
    try {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("webgl2");
      output.webgl2 = Boolean(context);
      if (context) {
        output.version = context.getParameter(context.VERSION);
        const extension = context.getExtension("WEBGL_debug_renderer_info");
        if (extension) {
          output.renderer = context.getParameter(extension.UNMASKED_RENDERER_WEBGL);
          output.vendor = context.getParameter(extension.UNMASKED_VENDOR_WEBGL);
        } else {
          output.renderer = context.getParameter(context.RENDERER);
          output.vendor = context.getParameter(context.VENDOR);
        }
        context.getExtension("WEBGL_lose_context")?.loseContext();
      }
    } catch (error) {
      output.error = String(error);
    }
    return output;
  });
}

async function fontProbe(page) {
  return page.evaluate(async () => {
    const result = { checkGeist: null, checkFullStack: null, families: [], bodyVariable: null };
    try {
      result.checkGeist = document.fonts.check('600 100px "Geist"', "NULLWORX");
      result.checkFullStack = document.fonts.check('600 100px "Geist", system-ui, sans-serif', "NULLWORX");
      result.bodyVariable = getComputedStyle(document.body).getPropertyValue("--font-geist-sans").trim();
      document.fonts.forEach((face) => result.families.push({ family: face.family, weight: face.weight, status: face.status }));
    } catch (error) {
      result.error = String(error);
    }
    return result;
  });
}

function sameBox(a, b, tolerance) {
  if (!a || !b) return false;
  return (
    Math.abs(a.width - b.width) <= tolerance &&
    Math.abs(a.height - b.height) <= tolerance
  );
}

async function runEngine(name, launcher, launchOptions) {
  const engineDir = path.join(EVIDENCE, name);
  const engineShots = path.join(SHOTS, name);
  await mkdir(engineShots, { recursive: true });
  await mkdir(engineDir, { recursive: true });

  const results = [];
  const record = (check, pass, detail) => {
    results.push({ check, pass: Boolean(pass), detail });
    console.log(`${pass ? "PASS" : "FAIL"}  ${name}/${check}${detail === undefined ? "" : ` — ${detail}`}`);
  };

  const bucket = makeBucket();
  let browser;
  try {
    browser = await launcher.launch({ ...launchOptions, timeout: 60000 });
  } catch (error) {
    return {
      engine: name,
      available: false,
      error: String(error),
      results,
    };
  }

  const out = {
    engine: name,
    available: true,
    browserVersion: browser.version(),
    launchedAt: new Date().toISOString(),
    launch: { engine: name, headless: launchOptions.headless ?? true, args: launchOptions.args ?? [] },
    webgl: null,
    css: null,
    font: null,
    viewports: {},
    reducedMotion: null,
    resize: null,
    mountUnmount: null,
    console: null,
    screenshots: [],
  };

  try {
    // ---------- desktop ----------
    const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
    const page = await newPage(desktop, bucket);
    await gotoLab(page);
    out.webgl = await webgl(page);
    out.font = await fontProbe(page);
    out.css = await cssCapabilities(page);

    record("webgl2 availability recorded", out.webgl.webgl2 === true, JSON.stringify(out.webgl));
    record("CSS mask-image supported", out.css.maskImageSupported === true, JSON.stringify(out.css));
    record("CSS mask-mode: alpha supported", out.css.maskModeSupported === true);

    const initialState = await readState(page);
    record("lab mounts", Boolean(initialState.lab), JSON.stringify(initialState.lab));
    record("desktop: no horizontal overflow", initialState.scrollWidth <= 1441, `${initialState.scrollWidth}/${initialState.innerWidth}`);
    if (!out.webgl.webgl2) {
      record("WebGL2 fallback is explicit", /WebGL2 is unavailable/.test(initialState.fallback ?? ""), initialState.fallback ?? "missing");
    }

    const desktopPresets = [];
    for (const letter of ["a", "b", "c", "d"]) {
      await selectPreset(page, letter);
      await setToggle(page, "Pause material", true);
      const state = await readState(page);
      const surface = SURFACE_FOR_PRESET[letter];
      const kind = MASK_KIND_FOR_PRESET[letter];
      const fallback = surface === "paper" && !out.webgl.webgl2;
      record(`${letter}: surface is ${surface}`, state.surface?.surface === surface, JSON.stringify(state.surface));
      record(`${letter}: mask kind is ${kind}`, state.surface?.maskKind === kind);
      record(`${letter}: stage keeps the mask aspect`, sameBox({ width: state.stageBox?.width ?? 0, height: state.stageBox?.height ?? 0 }, { width: (state.stageBox?.height ?? 0) * (kind === "text" ? 5 : 400 / 260), height: state.stageBox?.height ?? 0 }, 3), JSON.stringify(state.stageBox));
      if (fallback) {
        record(`${letter}: explicit fallback instead of material`, Boolean(state.fallback) && state.canvases === 0, state.fallback ?? "missing");
      } else {
        record(`${letter}: material mounted`, surface === "paper" ? state.canvases > 0 : state.holoText + state.holoGlyph > 0, JSON.stringify({ canvases: state.canvases, holoText: state.holoText, holoGlyph: state.holoGlyph }));
        const maskMap = await readMaskMap(page);
        record(`${letter}: canonical mask present`, Boolean(maskMap) && maskMap.coverage > 0.05, JSON.stringify(maskMap ? { coverage: maskMap.coverage, corners: maskMap.corners, intrinsic: maskMap.intrinsic } : null));
        const analysis = await boundary(page, letter, maskMap);
        record(`${letter}: material inside the mask`, analysis.ok && analysis.insideCoverage >= 0.85, JSON.stringify(analysis));
        record(`${letter}: no material outside the mask`, analysis.ok && analysis.outsideViolations === 0, JSON.stringify({ violations: analysis.outsideViolations, max: analysis.maxOutsideDelta, limit: analysis.tolerance }));
        if (kind === "text") {
          record(`${letter}: text mask aligns with content (y <= 3%)`, analysis.ok && analysis.bboxDelta.y !== null && analysis.bboxDelta.y <= 0.03, JSON.stringify(analysis.bboxDelta));
        }
        const shotName = `${name}-${letter}-desktop-1440x900.png`;
        await page.locator('[data-testid="composition-stage-inner"]').screenshot({ path: path.join(engineShots, shotName) });
        out.screenshots.push({ preset: letter, viewport: "1440x900", path: path.relative(EVIDENCE, path.join(engineShots, shotName)) });
      }
      desktopPresets.push({ letter, state, fallback });
    }
    out.viewports.desktop = { presets: desktopPresets };

    // Computed mask style has to be read while Paper is mounted.
    await selectPreset(page, "b");
    const paperCss = await cssCapabilities(page);
    out.css.computed = paperCss.computed;
    const appliedMask = paperCss.computed?.maskImage ?? paperCss.computed?.webkitMaskImage ?? "none";
    record("CSS alpha mask is applied to the mounted Paper surface", /url\(/.test(appliedMask), appliedMask.slice(0, 90));

    record("desktop: no console errors", bucket.consoleErrors.length === 0, JSON.stringify(bucket.consoleErrors.slice(0, 4)));
    record("desktop: no page errors", bucket.pageErrors.length === 0, JSON.stringify(bucket.pageErrors.slice(0, 2)));
    record("desktop: no failed requests", bucket.failedRequests.length === 0, JSON.stringify(bucket.failedRequests.slice(0, 4)));
    record("desktop: no external requests", bucket.externalRequests.length === 0, JSON.stringify(bucket.externalRequests.slice(0, 4)));

    // pointer interaction (HoloType advertises pointer input)
    await selectPreset(page, "a");
    await setToggle(page, "Pause material", false);
    const stage = page.locator('[data-testid="composition-stage-inner"]');
    const box = await stage.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
      await page.waitForTimeout(120);
      const atLeft = await page.evaluate(() => {
        const el = document.querySelector("[data-holo-text], [data-holo-glyph]");
        return { mx: el?.style.getPropertyValue("--holo-mx"), my: el?.style.getPropertyValue("--holo-my"), ry: el?.style.getPropertyValue("--holo-ry") };
      });
      await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.7);
      await page.waitForTimeout(120);
      const atRight = await page.evaluate(() => {
        const el = document.querySelector("[data-holo-text], [data-holo-glyph]");
        return { mx: el?.style.getPropertyValue("--holo-mx"), my: el?.style.getPropertyValue("--holo-my"), ry: el?.style.getPropertyValue("--holo-ry") };
      });
      out.pointer = { atLeft, atRight };
      record("pointer moves update the material", atLeft.mx !== atRight.mx && atLeft.my !== atRight.my, JSON.stringify({ atLeft, atRight }));
      await page.mouse.move(0, 0);
    }
    await desktop.close();

    // ---------- mobile ----------
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: "no-preference" });
    const mobilePage = await newPage(mobile, bucket);
    await gotoLab(mobilePage);
    const mobileState = await readState(mobilePage);
    record("mobile: no horizontal overflow", mobileState.scrollWidth <= 391, `${mobileState.scrollWidth}/${mobileState.innerWidth}`);
    record("mobile: stage fits the viewport", (mobileState.stageBox?.width ?? 9999) <= 390, JSON.stringify(mobileState.stageBox));
    const mobilePresets = [];
    for (const letter of ["a", "b", "c", "d"]) {
      await selectPreset(mobilePage, letter);
      await setToggle(mobilePage, "Pause material", true);
      const state = await readState(mobilePage);
      const fallback = SURFACE_FOR_PRESET[letter] === "paper" && !out.webgl.webgl2;
      if (!fallback) {
        const map = await readMaskMap(mobilePage);
        const analysis = await boundary(mobilePage, letter, map);
        record(`mobile ${letter}: material inside the mask`, analysis.ok && analysis.insideCoverage >= 0.85, JSON.stringify({ coverage: analysis.insideCoverage, outside: analysis.outsideViolations }));
        const shotName = `${name}-${letter}-mobile-390x844.png`;
        await mobilePage.locator('[data-testid="composition-stage-inner"]').screenshot({ path: path.join(engineShots, shotName) });
        out.screenshots.push({ preset: letter, viewport: "390x844", path: path.relative(EVIDENCE, path.join(engineShots, shotName)) });
        mobilePresets.push({ letter, analysis });
      } else {
        record(`mobile ${letter}: explicit fallback`, Boolean(state.fallback), state.fallback ?? "missing");
        mobilePresets.push({ letter, fallback: true });
      }
    }
    out.viewports.mobile = { state: { scrollWidth: mobileState.scrollWidth, stageBox: mobileState.stageBox }, presets: mobilePresets };
    record("mobile: no console errors", bucket.consoleErrors.length === 0, JSON.stringify(bucket.consoleErrors.slice(0, 4)));
    await mobile.close();

    // ---------- reduced motion ----------
    const reduced = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    const reducedPage = await newPage(reduced, bucket);
    await gotoLab(reducedPage);
    await selectPreset(reducedPage, "b");
    const reducedState = await readState(reducedPage);
    const reducedFace = await reducedPage.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
    out.reducedMotion = { mediaMatches: reducedFace, state: reducedState };
    record("reduced motion: media query is honoured", reducedFace === true);
    record("reduced motion: lab reports REDUCED", reducedState.effectiveState === "REDUCED", reducedState.effectiveState ?? "missing");
    if (out.webgl.webgl2) {
      record("reduced motion: Paper speed is zero", reducedState.paperSpeed === 0, String(reducedState.paperSpeed));
      record("reduced motion: no persistent animation frames", reducedState.rafActive === 0, String(reducedState.rafActive));
    }
    await setToggle(reducedPage, "Force reduced motion", false);
    await selectPreset(reducedPage, "a");
    const reducedHolo = await readState(reducedPage);
    record("reduced motion: HoloType is static", reducedHolo.surface?.animated === "false" && reducedHolo.rafActive === 0, JSON.stringify({ animated: reducedHolo.surface?.animated, raf: reducedHolo.rafActive }));
    const reducedShot = path.join(engineShots, `${name}-reduced-motion-1440x900.png`);
    await reducedPage.locator('[data-testid="composition-stage-inner"]').screenshot({ path: reducedShot });
    out.screenshots.push({ preset: "reduced", viewport: "1440x900", path: path.relative(EVIDENCE, reducedShot) });
    record("reduced motion: no console errors", bucket.consoleErrors.length === 0, JSON.stringify(bucket.consoleErrors.slice(0, 4)));
    await reduced.close();

    // ---------- resize ----------
    const resize = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const resizePage = await newPage(resize, bucket);
    await gotoLab(resizePage);
    await selectPreset(resizePage, "d");
    const resizeSteps = [];
    for (const viewport of [{ width: 1024, height: 768 }, { width: 390, height: 844 }, { width: 1440, height: 900 }]) {
      await resizePage.setViewportSize(viewport);
      await resizePage.waitForTimeout(500);
      const state = await readState(resizePage);
      resizeSteps.push({ viewport, stageBox: state.stageBox, scrollWidth: state.scrollWidth, maskSource: state.maskSource });
    }
    out.resize = resizeSteps;
    record("resize: no horizontal overflow at 1024", resizeSteps[0].scrollWidth <= 1025, String(resizeSteps[0].scrollWidth));
    record("resize: no horizontal overflow at 390", resizeSteps[1].scrollWidth <= 391, String(resizeSteps[1].scrollWidth));
    record("resize: stage ratio preserved", resizeSteps.every((step) => step.stageBox && Math.abs(step.stageBox.width / step.stageBox.height - 5) < 0.03), JSON.stringify(resizeSteps.map((step) => step.stageBox)));
    record("resize: no console errors", bucket.consoleErrors.length === 0, JSON.stringify(bucket.consoleErrors.slice(0, 4)));
    await resize.close();

    // ---------- mount / unmount ----------
    const life = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    const lifePage = await newPage(life, bucket);
    await gotoLab(lifePage);
    await selectPreset(lifePage, "b");
    const beforeNav = await readState(lifePage);
    await lifePage.locator('a[aria-label="Nullworx UI Forge gallery"]').click();
    await lifePage.waitForURL(`${ORIGIN}/`, { timeout: 20000 });
    await lifePage.waitForTimeout(600);
    const afterLeave = await lifePage.evaluate(() => ({
      canvases: document.querySelectorAll("canvas").length,
      gl: { ...window.__gl },
      rafActive: window.__rafActive.size,
    }));
    await lifePage.goBack({ waitUntil: "networkidle" });
    await lifePage.waitForSelector('[data-testid="composition-lab"]', { timeout: 20000 });
    await selectPreset(lifePage, "b");
    const afterReturn = await readState(lifePage);
    out.mountUnmount = { beforeNav: beforeNav.gl, afterLeave, afterReturn: { gl: afterReturn.gl, canvases: afterReturn.canvases, raf: afterReturn.rafActive } };
    record("mount/unmount: canvas removed on navigation", afterLeave.canvases === 0, JSON.stringify(afterLeave));
    record("mount/unmount: no leaked live WebGL context", afterLeave.gl.live === 0, JSON.stringify(afterLeave.gl));
    record("mount/unmount: remount creates a working canvas", afterReturn.canvases > 0 && afterReturn.gl.live >= 1, JSON.stringify({ canvases: afterReturn.canvases, gl: afterReturn.gl }));
    record("mount/unmount: no console errors", bucket.consoleErrors.length === 0, JSON.stringify(bucket.consoleErrors.slice(0, 4)));
    await life.close();
  } catch (error) {
    record("engine run completed", false, error?.stack ?? String(error));
  } finally {
    await browser?.close().catch(() => {});
  }

  out.results = results;
  out.passed = results.filter((entry) => entry.pass).length;
  out.failed = results.filter((entry) => !entry.pass).length;
  out.console = bucket;
  await writeFile(path.join(engineDir, "results.json"), JSON.stringify(out, null, 2) + "\n");
  await writeFile(path.join(engineDir, "console.json"), JSON.stringify(bucket, null, 2) + "\n");
  console.log(`\n${name}: ${out.passed}/${results.length} checks passed\n`);
  return out;
}

await mkdir(SHOTS, { recursive: true });
const engines = [];
const wanted = (name) => !ONLY || ONLY.includes(name);

if (wanted("chromium")) {
  engines.push(
    await runEngine("chromium", chromium, {
      executablePath: CHROME,
      headless: true,
      args: GPU_ARGS,
    }),
  );
}

if (wanted("firefox")) {
  engines.push(
    await runEngine("firefox", firefox, {
      headless: true,
      firefoxUserPrefs: {
        "webgl.force-enabled": true,
        "webgl.disabled": false,
        "webgl.disable-fail-if-major-performance-caveat": true,
        "gfx.webrender.all": true,
      },
    }),
  );
}

if (wanted("webkit")) {
  engines.push(await runEngine("webkit", webkit, { headless: true }));
}

const summary = {
  generatedAt: new Date().toISOString(),
  origin: ORIGIN,
  engines: engines.map((engine) => ({
    engine: engine.engine,
    available: engine.available,
    version: engine.browserVersion ?? null,
    webgl: engine.webgl ?? null,
    css: engine.css ?? null,
    font: engine.font ?? null,
    passed: engine.passed ?? 0,
    failed: engine.failed ?? 0,
    failedChecks: (engine.results ?? []).filter((entry) => !entry.pass).map((entry) => entry.check),
    error: engine.error ?? null,
  })),
};
await writeFile(path.join(EVIDENCE, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify(summary.engines.map((engine) => ({ engine: engine.engine, passed: engine.passed, failed: engine.failed, webgl2: engine.webgl?.webgl2, version: engine.version })), null, 2));
