#!/usr/bin/env node
/**
 * G2 browser evidence harness.
 *
 * Run against a production build:
 *   pnpm start --hostname 127.0.0.1 --port 3100
 *   EVIDENCE_DIR=evidence pnpm verify:effects
 *
 * Uses the system Chrome through playwright-core; no browser download.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";

const ORIGIN = process.env.ORIGIN ?? "http://127.0.0.1:3100";
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const EVIDENCE = path.resolve(process.env.EVIDENCE_DIR ?? "evidence/g2");
const SHOTS = path.join(EVIDENCE, "screenshots");
const CHECKS = path.join(EVIDENCE, "checks");
const PERF_SAMPLE_MS = Number(process.env.PERF_SAMPLE_MS ?? 2200);

const results = [];
const findings = [];
const screenshots = [];
const diagnostics = [];
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

function attachDiagnostics(page, bucket) {
  page.on("console", (message) => {
    const entry = { type: message.type(), text: message.text() };
    if (message.type() === "error") bucket.consoleErrors.push(entry);
    else if (message.type() === "warning") bucket.consoleWarnings.push(entry);
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
    if (/^(data:|blob:)/.test(url)) return;
    try {
      if (new URL(url).origin !== ORIGIN) bucket.externalRequests.push(url);
    } catch {
      bucket.externalRequests.push(url);
    }
  });
}

async function createPage(browser, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 1440, height: 900 },
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
    isMobile: options.isMobile ?? false,
    hasTouch: options.hasTouch ?? false,
    reducedMotion: options.reducedMotion ?? "no-preference",
  });
  const page = await context.newPage();
  const bucket = {
    label: options.label ?? "desktop",
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    requestFailures: [],
    httpErrors: [],
    externalRequests: [],
  };
  attachDiagnostics(page, bucket);
  await page.addInitScript(INIT_SCRIPT);
  diagnostics.push(bucket);
  return { context, page, bucket };
}

async function loadLab(page) {
  await page.goto(`${ORIGIN}/labs/effects`, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="effect-lab"]');
}

async function openEffect(page, id) {
  await page.getByTestId(`effect-tab-${id}`).click();
  const map = {
    "holotype-foil": '[data-testid="holotype-preview"]',
    "paper-mesh-gradient": '[data-testid="paper-mesh-preview"]',
    "motion-signal-behavior": '[data-testid="motion-behavior-preview"]',
  };
  await page.waitForSelector(map[id]);
}

async function activeRaf(page) {
  return page.evaluate(() => window.__rafActive.size);
}

async function glState(page) {
  return page.evaluate(() => ({
    ...window.__gl,
    canvases: document.querySelectorAll("canvas").length,
    raf: window.__rafActive.size,
  }));
}

async function shot(page, name, meta = {}) {
  const file = path.join(SHOTS, `${name}.png`);
  await page.screenshot({
    path: file,
    fullPage: meta.fullPage ?? true,
    animations: meta.animations ?? "allow",
  });
  const buffer = await readFile(file);
  screenshots.push({
    name,
    file: path.relative(EVIDENCE, file).split(path.sep).join("/"),
    sha256: createHash("sha256").update(buffer).digest("hex"),
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    viewport: meta.viewport ?? null,
    deviceScaleFactor: meta.deviceScaleFactor ?? 1,
    reducedMotion: meta.reducedMotion ?? "no-preference",
    effect: meta.effect ?? null,
  });
  console.log(`SHOT  ${name} (${buffer.readUInt32BE(16)}×${buffer.readUInt32BE(20)})`);
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

function frameStats(frames) {
  const samples = frames.slice(2);
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const median = percentile(sorted, 0.5);
  return {
    frames: samples.length,
    medianFrameMs: Number(median.toFixed(3)),
    meanFrameMs: Number(mean.toFixed(3)),
    p95FrameMs: Number(percentile(sorted, 0.95).toFixed(3)),
    maxFrameMs: Number(Math.max(...samples).toFixed(3)),
    medianFps: Number((1000 / median).toFixed(2)),
    longFramesOver25ms: samples.filter((value) => value > 25).length,
  };
}

async function sampleFrames(page, durationMs = PERF_SAMPLE_MS) {
  return page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        const frames = [];
        let last = performance.now();
        const start = last;
        function tick(now) {
          frames.push(now - last);
          last = now;
          if (now - start < duration) requestAnimationFrame(tick);
          else resolve(frames);
        }
        requestAnimationFrame(tick);
      }),
    durationMs,
  );
}

async function measureRound(page, id, readySelector) {
  await loadLab(page);
  await openEffect(page, id);
  await page.waitForSelector(readySelector, { timeout: 15000 });
  if (id === "paper-mesh-gradient") {
    await page.waitForFunction(
      () => document.querySelector('[data-testid="paper-mesh-preview"]')?.getAttribute("data-webgl") === "ready",
      null,
      { timeout: 15000 },
    );
  }
  await page.waitForTimeout(1200);
  const stats = frameStats(await sampleFrames(page));
  return { id, ...stats };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

function summarizeRounds(id, rounds) {
  return {
    id,
    runs: rounds,
    medianFrameMs: Number(median(rounds.map((round) => round.medianFrameMs)).toFixed(3)),
    meanFrameMs: Number(median(rounds.map((round) => round.meanFrameMs)).toFixed(3)),
    p95FrameMs: Number(median(rounds.map((round) => round.p95FrameMs)).toFixed(3)),
    medianFps: Number(median(rounds.map((round) => round.medianFps)).toFixed(2)),
    longFramesOver25ms: median(rounds.map((round) => round.longFramesOver25ms)),
  };
}

async function heapMetrics(session) {
  await session.send("HeapProfiler.enable");
  await session.send("HeapProfiler.collectGarbage");
  await session.send("Performance.enable");
  const { metrics } = await session.send("Performance.getMetrics");
  const map = Object.fromEntries(metrics.map((metric) => [metric.name, metric.value]));
  return {
    jsHeapUsedSize: map.JSHeapUsedSize,
    nodes: map.Nodes,
    documents: map.Documents,
    jsEventListeners: map.JSEventListeners,
  };
}

async function setRange(locator, value) {
  await locator.evaluate((element, next) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    setter?.call(element, String(next));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

const startedAt = Date.now();
await mkdir(SHOTS, { recursive: true });
await mkdir(CHECKS, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    "--disable-background-timer-throttling",
    "--disable-backgrounding-occluded-windows",
    "--disable-renderer-backgrounding",
    "--disable-features=CalculateNativeWinOcclusion",
    "--force-device-scale-factor=1",
  ],
});

try {
  const { context: desktopContext, page, bucket: desktopBucket } = await createPage(browser, {
    label: "desktop-1440x900",
    viewport: { width: 1440, height: 900 },
  });

  await scenario("home gallery preservation", async () => {
    await page.goto(ORIGIN, { waitUntil: "networkidle" });
    const heading = await page.locator("#hero-title").innerText();
    check("home gallery renders the existing UI Forge hero", heading.includes("Small components."), heading.replace(/\s+/g, " "));
    await page.waitForSelector("#component-title");
    const componentTitle = await page.locator("#component-title").innerText();
    check("home gallery still opens CommandButton", componentTitle === "CommandButton", componentTitle);
    const navCount = await page.locator('nav[aria-label="Component library"] button').count();
    check("home gallery still exposes exactly three components", navCount === 3, String(navCount));
    await shot(page, "home-desktop-1440x900", {
      effect: "ui-forge-gallery",
      viewport: "1440x900",
      fullPage: true,
      animations: "disabled",
    });
  });

  await scenario("lab SSR and lazy loading", async () => {
    const response = await fetch(`${ORIGIN}/labs/effects`);
    const html = await response.text();
    check("lab route responds 200", response.ok, String(response.status));
    check("server HTML contains the lab heading", html.includes("Three effects."));
    check("server HTML contains the Suspense fallback", html.includes("Loading adapter"));
    check("server HTML has no canvas before hydration", !html.toLowerCase().includes("<canvas"));
    await loadLab(page);
    check("lab shell hydrates", (await page.locator('[data-testid="effect-lab"]').count()) === 1);
  });

  await scenario("HoloType existing effect", async () => {
    await openEffect(page, "holotype-foil");
    await page.waitForSelector('[data-testid="holotype-preview"] [data-holo-text]');
    const text = await page.locator('[data-testid="holotype-preview"] [data-holo-layer="base"]').innerText();
    check("HoloType renders the FORGE specimen", text.trim() === "FORGE", text.trim());
    const initialSpectral = await page
      .locator('[data-testid="holotype-preview"] [data-holo-text]')
      .evaluate((element) => element.style.getPropertyValue("--holo-spectral"));
    check("HoloType exposes its material variables", initialSpectral === "0.4", initialSpectral);
    const animation = await page
      .locator('[data-testid="holotype-preview"] [data-holo-layer="spectral"]')
      .evaluate((element) => getComputedStyle(element).animationName);
    check("HoloType animation is active by default", animation !== "none", animation);

    await page.locator('[data-testid="holotype-adapter"]').getByRole("button", { name: "Aurora", exact: true }).click();
    await page.waitForTimeout(150);
    const auroraSpectral = await page
      .locator('[data-testid="holotype-preview"] [data-holo-text]')
      .evaluate((element) => element.style.getPropertyValue("--holo-spectral"));
    check("preset change updates the HoloType material", auroraSpectral === "0.92", auroraSpectral);

    await page.locator('[data-testid="holotype-adapter"]').getByRole("button", { name: "Paper", exact: true }).click();
    await page.waitForTimeout(100);
    check(
      "tone switch applies the paper ramp",
      (await page.getByTestId("holotype-preview").getAttribute("data-tone")) === "light",
    );

    const spectralSlider = page
      .locator('[data-testid="holotype-adapter"]')
      .getByRole("slider", { name: /Spectral intensity/ });
    await setRange(spectralSlider, 0.75);
    await page.waitForTimeout(100);
    const sliderValue = await page
      .locator('[data-testid="holotype-preview"] [data-holo-text]')
      .evaluate((element) => element.style.getPropertyValue("--holo-spectral"));
    check("runtime-validated slider updates HoloType", sliderValue === "0.75", sliderValue);
    check(
      "runtime validator reports valid params",
      (await page.locator('[data-testid="holotype-adapter"] [role="status"]').innerText()).includes("params valid"),
    );

    await page.locator('[data-testid="holotype-adapter"]').getByRole("button", { name: "Reduced", exact: true }).click();
    await page.waitForTimeout(150);
    const reducedAnimation = await page
      .locator('[data-testid="holotype-preview"] [data-holo-layer="spectral"]')
      .evaluate((element) => getComputedStyle(element).animationName);
    check("explicit reduced motion freezes HoloType", reducedAnimation === "none", reducedAnimation);
    check(
      "reduced-motion state is observable",
      (await page.getByTestId("holotype-preview").getAttribute("data-reduced")) === "true",
    );
    await page.locator('[data-testid="holotype-adapter"]').getByRole("button", { name: "OS", exact: true }).click();
    await page.waitForTimeout(150);
    await shot(page, "lab-desktop-holotype-1440x900", {
      effect: "holotype-foil",
      viewport: "1440x900",
      fullPage: true,
      animations: "disabled",
    });
  });

  await scenario("Motion behavior", async () => {
    await openEffect(page, "motion-signal-behavior");
    await page.waitForTimeout(500);
    check(
      "Motion starts in scan mode",
      (await page.getByTestId("motion-behavior-preview").getAttribute("data-mode")) === "scan",
    );
    const runningAnimations = await page.evaluate(
      () => document.getAnimations().filter((animation) => animation.playState === "running").length,
    );
    check("Motion pulse has a running animation", runningAnimations > 0, String(runningAnimations));
    await page.locator('[data-testid="motion-adapter"]').getByRole("button", { name: "Hold", exact: true }).click();
    await page.waitForTimeout(900);
    const holdAnimations = await page.evaluate(() => {
      const pulse = document.querySelector("[data-motion-pulse]");
      return pulse ? pulse.getAnimations().filter((animation) => animation.playState === "running").length : -1;
    });
    check("Motion hold state stops the pulse", holdAnimations === 0, String(holdAnimations));
    check(
      "Motion mode switch updates state",
      (await page.getByTestId("motion-behavior-preview").getAttribute("data-mode")) === "hold",
    );
    check(
      "Motion keyed content follows the mode",
      (await page.locator('[data-testid="motion-behavior-preview"] h3').innerText()) === "Held sample",
    );
    await page.locator('[data-testid="motion-adapter"]').getByRole("button", { name: "Replay entry" }).click();
    await page.waitForTimeout(1000);
    check("Motion replay does not throw or unmount", (await page.getByTestId("motion-behavior-preview").count()) === 1);
    await shot(page, "lab-desktop-motion-1440x900", {
      effect: "motion-signal-behavior",
      viewport: "1440x900",
      fullPage: true,
    });
  });

  await scenario("Paper Shader preview", async () => {
    await openEffect(page, "paper-mesh-gradient");
    await page.waitForFunction(
      () => document.querySelector('[data-testid="paper-mesh-preview"]')?.getAttribute("data-webgl") === "ready",
      null,
      { timeout: 15000 },
    );
    await page.waitForSelector('[data-paper-shader] canvas');
    await page.waitForTimeout(700);
    const state = await glState(page);
    check("Paper mounts one WebGL2 canvas", state.live >= 1 && state.canvases >= 1, JSON.stringify(state));
    const canvasSize = await page.locator('[data-paper-shader] canvas').evaluate((canvas) => ({
      width: canvas.width,
      height: canvas.height,
      cssWidth: canvas.getBoundingClientRect().width,
    }));
    check("Paper canvas has a non-zero backing size", canvasSize.width > 0 && canvasSize.height > 0, JSON.stringify(canvasSize));

    const colorsBefore = await page.evaluate(() => {
      const mount = document.querySelector("div[data-paper-shader]")?.paperShaderMount;
      return JSON.stringify(mount?.providedUniforms?.u_colors ?? null);
    });
    await page.locator('[data-testid="paper-adapter"]').getByRole("button", { name: "Ink", exact: true }).click();
    await page.waitForTimeout(300);
    const colorsAfter = await page.evaluate(() => {
      const mount = document.querySelector("div[data-paper-shader]")?.paperShaderMount;
      return JSON.stringify(mount?.providedUniforms?.u_colors ?? null);
    });
    check("Paper preset updates upstream uniforms", colorsBefore !== colorsAfter, `${colorsBefore} -> ${colorsAfter}`);

    const pause = page.locator('[data-testid="paper-adapter"]').getByRole("checkbox", { name: /Pause shader/ });
    await pause.check();
    await page.waitForTimeout(350);
    const pausedSpeed = await page.evaluate(() => document.querySelector("div[data-paper-shader]")?.paperShaderMount?.speed);
    check("Paper pause sets upstream speed to zero", pausedSpeed === 0, String(pausedSpeed));
    const pausedRaf = await activeRaf(page);
    check("Paper pause stops its animation loop", pausedRaf === 0, String(pausedRaf));
    await pause.uncheck();
    await page.locator('[data-testid="paper-adapter"]').getByRole("button", { name: "Default", exact: true }).click();
    await page.waitForTimeout(500);

    await shot(page, "lab-desktop-paper-1440x900", {
      effect: "paper-mesh-gradient",
      viewport: "1440x900",
      fullPage: true,
    });
  });

  await scenario("resize and mount/unmount", async () => {
    await openEffect(page, "paper-mesh-gradient");
    await page.waitForSelector('[data-paper-shader] canvas');
    await page.waitForTimeout(500);
    const before = await page.locator('[data-paper-shader] canvas').evaluate((canvas) => canvas.width);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(600);
    const after = await page.locator('[data-paper-shader] canvas').evaluate((canvas) => canvas.width);
    check("Paper canvas resizes with the viewport", before !== after, `${before} -> ${after}`);
    check(
      "no horizontal overflow at 1024px",
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(600);
    check(
      "no horizontal overflow at 390px",
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      String(await page.evaluate(() => document.documentElement.scrollWidth)),
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);

    const liveNodesBefore = await page.evaluate(() => document.querySelectorAll("*").length);
    const cdp = await desktopContext.newCDPSession(page);
    const beforeHeap = await heapMetrics(cdp);
    for (let cycle = 0; cycle < 8; cycle += 1) {
      await openEffect(page, "holotype-foil");
      await page.waitForTimeout(180);
      await openEffect(page, "paper-mesh-gradient");
      await page.waitForTimeout(220);
    }
    await openEffect(page, "holotype-foil");
    await page.waitForTimeout(700);
    const afterHolo = await glState(page);
    check("leaving Paper removes its canvas", afterHolo.canvases === 0, JSON.stringify(afterHolo));
    check("leaving Paper releases its WebGL context", afterHolo.live === 0, JSON.stringify(afterHolo));
    const liveNodesAfter = await page.evaluate(() => document.querySelectorAll("*").length);
    const afterHeap = await heapMetrics(cdp);
    const heapDelta = afterHeap.jsHeapUsedSize - beforeHeap.jsHeapUsedSize;
    const nodeDelta = liveNodesAfter - liveNodesBefore;
    check(
      "repeated mount/unmount does not grow live DOM nodes unboundedly",
      nodeDelta < 150,
      `live nodes ${liveNodesBefore} -> ${liveNodesAfter} (${nodeDelta}); CDP nodes ${beforeHeap.nodes} -> ${afterHeap.nodes}`,
    );
    check(
      "repeated mount/unmount does not grow JS heap unboundedly",
      heapDelta < 12 * 1024 * 1024,
      `heap ${Math.round(beforeHeap.jsHeapUsedSize / 1024)} KiB -> ${Math.round(afterHeap.jsHeapUsedSize / 1024)} KiB (${Math.round(heapDelta / 1024)} KiB)`,
    );
    diagnostics.push({ label: "heap", before: beforeHeap, after: afterHeap, heapDelta, nodeDelta, liveNodesBefore, liveNodesAfter });
  });

  await scenario("performance comparison", async () => {
    const controlRounds = [];
    const candidateRounds = [];
    for (let round = 0; round < 3; round += 1) {
      controlRounds.push(await measureRound(page, "holotype-foil", '[data-testid="holotype-preview"]'));
      candidateRounds.push(await measureRound(page, "paper-mesh-gradient", '[data-paper-shader] canvas'));
    }
    const motionRound = await measureRound(page, "motion-signal-behavior", '[data-testid="motion-behavior-preview"]');
    const control = summarizeRounds("holotype-foil", controlRounds);
    const candidate = summarizeRounds("paper-mesh-gradient", candidateRounds);
    const budgetMs = control.medianFrameMs * 1.25;
    const regression = (candidate.medianFrameMs - control.medianFrameMs) / control.medianFrameMs;
    const spread = (rounds) => {
      const values = rounds.map((round) => round.medianFrameMs);
      return (Math.max(...values) - Math.min(...values)) / median(values);
    };
    const controlSpread = spread(controlRounds);
    const candidateSpread = spread(candidateRounds);
    const performance = {
      methodology: {
        build: "next build + next start",
        browser: "system Google Chrome 156 via playwright-core 1.64.1",
        renderer: "SwiftShader software WebGL2",
        viewport: "1440x900, DPR 1",
        sample: "3 alternating A/B rounds; 1.2 s warmup + 2.2 s rAF cadence per round; median of per-round medians",
        note: "Order is alternated so control and candidate see the same host state. Software compositing is not a GPU benchmark.",
      },
      control,
      candidate,
      supplementaryMotion: motionRound,
      budget: { maxMedianRegression: 0.25, controlBudgetMs: Number(budgetMs.toFixed(3)) },
      regression: Number(regression.toFixed(4)),
      budgetExceeded: regression > 0.25,
      stability: {
        controlSpread: Number(controlSpread.toFixed(4)),
        candidateSpread: Number(candidateSpread.toFixed(4)),
        stable: controlSpread <= 0.15 && candidateSpread <= 0.15,
      },
      interpretation:
        regression <= 0
          ? "Candidate median frame time is at or below the existing effector control in this software-rendered environment."
          : "Candidate median frame time is above the control; compare against the 25% budget.",
    };
    check("performance comparison produced three control rounds", controlRounds.length === 3);
    check("performance comparison produced three candidate rounds", candidateRounds.length === 3);
    check(
      "performance comparison recorded environment stability",
      true,
      JSON.stringify(performance.stability),
    );
    if (!performance.stability.stable) {
      finding(
        "performance-environment-unstable",
        `control spread ${Math.round(controlSpread * 100)}%, candidate spread ${Math.round(candidateSpread * 100)}%; treat medians as host-dependent, not a GPU benchmark`,
      );
    }
    if (control.medianFps < 59 || candidate.medianFps < 59) {
      finding(
        "software-renderer-frame-drops",
        `median cadence control ${control.medianFps} fps, candidate ${candidate.medianFps} fps; long frames >25 ms control ${control.longFramesOver25ms}, candidate ${candidate.longFramesOver25ms}`,
      );
    }
    performance.findings = findings;
    await writeFile(path.join(EVIDENCE, "performance.json"), JSON.stringify(performance, null, 2) + "\n");
    if (performance.budgetExceeded) {
      console.log(
        `FINDING  Paper median frame time exceeds the 25% budget: ${control.medianFrameMs} ms -> ${candidate.medianFrameMs} ms (${Math.round(regression * 100)}%)`,
      );
    }
    if (regression < 0) {
      console.log(
        `NOTE  Paper is faster than the HoloType control in this environment: ${control.medianFrameMs} ms -> ${candidate.medianFrameMs} ms.`,
      );
    }
  });

  const desktopDiagnostics = desktopBucket;
  check("desktop: no console errors", desktopDiagnostics.consoleErrors.length === 0, JSON.stringify(desktopDiagnostics.consoleErrors.slice(0, 5)));
  check("desktop: no uncaught page errors", desktopDiagnostics.pageErrors.length === 0, JSON.stringify(desktopDiagnostics.pageErrors.slice(0, 2)));
  check("desktop: no failed requests", desktopDiagnostics.requestFailures.length === 0, JSON.stringify(desktopDiagnostics.requestFailures.slice(0, 5)));
  check("desktop: no HTTP errors", desktopDiagnostics.httpErrors.length === 0, JSON.stringify(desktopDiagnostics.httpErrors.slice(0, 5)));
  check("desktop: no external network requests", desktopDiagnostics.externalRequests.length === 0, JSON.stringify(desktopDiagnostics.externalRequests.slice(0, 5)));
  check(
    "desktop: no hydration errors",
    !desktopDiagnostics.consoleErrors.some((entry) => /hydrat|did not match|server rendered/i.test(entry.text)),
  );
  await contextClose(desktopContext);

  await scenario("mobile 390x844", async () => {
    const mobile = await createPage(browser, {
      label: "mobile-390x844",
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = mobile.page;
    await loadLab(mobilePage);
    await openEffect(mobilePage, "holotype-foil");
    await mobilePage.waitForTimeout(500);
    check(
      "mobile: no horizontal overflow",
      await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      String(await mobilePage.evaluate(() => document.documentElement.scrollWidth)),
    );
    const tabBoxes = await mobilePage.locator('[data-testid^="effect-tab-"]').evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { left: rect.left, right: rect.right, width: rect.width };
      }),
    );
    check(
      "mobile: effect tabs fit the viewport",
      tabBoxes.every((box) => box.left >= -1 && box.right <= 391 && box.width > 0),
      JSON.stringify(tabBoxes),
    );
    await shot(mobilePage, "lab-mobile-holotype-390x844", {
      effect: "holotype-foil",
      viewport: "390x844",
      deviceScaleFactor: 2,
      fullPage: true,
    });

    await openEffect(mobilePage, "paper-mesh-gradient");
    await mobilePage.waitForSelector('[data-paper-shader] canvas');
    await mobilePage.waitForTimeout(900);
    check(
      "mobile: Paper canvas fits without overflow",
      await mobilePage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    );
    await shot(mobilePage, "lab-mobile-paper-390x844", {
      effect: "paper-mesh-gradient",
      viewport: "390x844",
      deviceScaleFactor: 2,
      fullPage: true,
    });

    await openEffect(mobilePage, "motion-signal-behavior");
    await mobilePage.waitForTimeout(600);
    await shot(mobilePage, "lab-mobile-motion-390x844", {
      effect: "motion-signal-behavior",
      viewport: "390x844",
      deviceScaleFactor: 2,
      fullPage: true,
    });

    check("mobile: no console errors", mobile.bucket.consoleErrors.length === 0, JSON.stringify(mobile.bucket.consoleErrors.slice(0, 5)));
    check("mobile: no page errors", mobile.bucket.pageErrors.length === 0);
    check("mobile: no failed requests", mobile.bucket.requestFailures.length === 0);
    check("mobile: no external requests", mobile.bucket.externalRequests.length === 0);
    diagnostics.push(mobile.bucket);
    await contextClose(mobile.context);
  });

  await scenario("reduced motion", async () => {
    const reduced = await createPage(browser, {
      label: "reduced-motion",
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    const reducedPage = reduced.page;
    await loadLab(reducedPage);
    await openEffect(reducedPage, "holotype-foil");
    await reducedPage.waitForTimeout(600);
    check(
      "reduced motion: HoloType reports reduced state",
      (await reducedPage.getByTestId("holotype-preview").getAttribute("data-reduced")) === "true",
    );
    const holoAnimation = await reducedPage
      .locator('[data-testid="holotype-preview"] [data-holo-layer="spectral"]')
      .evaluate((element) => getComputedStyle(element).animationName);
    check("reduced motion: HoloType CSS animation stops", holoAnimation === "none", holoAnimation);
    await shot(reducedPage, "lab-reduced-holotype-1440x900", {
      effect: "holotype-foil",
      viewport: "1440x900",
      reducedMotion: "reduce",
      fullPage: true,
    });

    await openEffect(reducedPage, "paper-mesh-gradient");
    await reducedPage.waitForSelector('[data-paper-shader] canvas');
    await reducedPage.waitForTimeout(900);
    check(
      "reduced motion: Paper reports reduced state",
      (await reducedPage.getByTestId("paper-mesh-preview").getAttribute("data-reduced")) === "true",
    );
    const paperSpeed = await reducedPage.evaluate(
      () => document.querySelector("div[data-paper-shader]")?.paperShaderMount?.speed,
    );
    check("reduced motion: Paper shader speed is zero", paperSpeed === 0, String(paperSpeed));
    check("reduced motion: Paper has no active shader frames", (await activeRaf(reducedPage)) === 0, String(await activeRaf(reducedPage)));
    await shot(reducedPage, "lab-reduced-paper-1440x900", {
      effect: "paper-mesh-gradient",
      viewport: "1440x900",
      reducedMotion: "reduce",
      fullPage: true,
    });

    await openEffect(reducedPage, "motion-signal-behavior");
    await reducedPage.waitForTimeout(900);
    check(
      "reduced motion: Motion reports reduced state",
      (await reducedPage.getByTestId("motion-behavior-preview").getAttribute("data-reduced")) === "true",
    );
    const reducedAnimations = await reducedPage.evaluate(() => {
      const pulse = document.querySelector("[data-motion-pulse]");
      return pulse ? pulse.getAnimations().filter((animation) => animation.playState === "running").length : -1;
    });
    check("reduced motion: Motion leaves no running animation", reducedAnimations === 0, String(reducedAnimations));
    check("reduced motion: Motion leaves no active frames", (await activeRaf(reducedPage)) === 0, String(await activeRaf(reducedPage)));
    await shot(reducedPage, "lab-reduced-motion-1440x900", {
      effect: "motion-signal-behavior",
      viewport: "1440x900",
      reducedMotion: "reduce",
      fullPage: true,
    });

    check("reduced motion: no console errors", reduced.bucket.consoleErrors.length === 0, JSON.stringify(reduced.bucket.consoleErrors.slice(0, 5)));
    check("reduced motion: no page errors", reduced.bucket.pageErrors.length === 0);
    diagnostics.push(reduced.bucket);
    await contextClose(reduced.context);
  });

  const warnings = diagnostics.flatMap((bucket) => (bucket.consoleWarnings ?? []).map((warning) => ({ bucket: bucket.label, ...warning })));
  check("console warnings are understood", warnings.length === 0, JSON.stringify(warnings.slice(0, 8)));

  const summary = {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    origin: ORIGIN,
    browser: `Google Chrome via playwright-core 1.64.1 (${CHROME})`,
    results,
    findings,
    failures,
    passed: results.filter((result) => result.pass).length,
    total: results.length,
    screenshots,
    diagnostics,
    warnings,
  };
  await writeFile(path.join(EVIDENCE, "verify.json"), JSON.stringify(summary, null, 2) + "\n");
  await writeFile(path.join(CHECKS, "console-network.json"), JSON.stringify({ diagnostics, warnings }, null, 2) + "\n");
  await writeFile(path.join(SHOTS, "manifest.json"), JSON.stringify(screenshots, null, 2) + "\n");
  console.log(`\n${summary.passed}/${summary.total} checks passed; ${failures} failed.`);
  console.log(`Evidence: ${EVIDENCE}`);
  if (failures > 0) process.exitCode = 1;
} finally {
  await browser.close();
}

async function contextClose(context) {
  await context.close();
}
