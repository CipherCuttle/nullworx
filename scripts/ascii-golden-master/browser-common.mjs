import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export const root = resolve(import.meta.dirname, '../..');
export const out = resolve(root, 'evidence/ascii-golden-master-2026-10-30');
export const config = JSON.parse(readFileSync(resolve(out, 'audit-context.json')));
export const save = (name, value) => writeFileSync(resolve(out, name), JSON.stringify(value, null, 2) + '\n');
export const launchOptions = {
  executablePath: '/usr/bin/google-chrome',
  headless: false,
  args: ['--no-sandbox', '--disable-gpu-sandbox', '--window-position=40,40'],
};
export const launch = () => chromium.launch(launchOptions);

// Test-only discovery of the preserved component's existing imperative handle.
// No source instrumentation, replacement renderer, or production test API.
export async function attachApi(page) {
  await page.waitForFunction(() => {
    if (window.__asciiWaves || window.__asciiWavesReact) return true;
    const node = document.querySelector('[data-ascii-waves]');
    if (!node) return false;
    let fiber = node[Object.keys(node).find((key) => key.startsWith('__reactFiber'))];
    for (let n = 0; fiber && n < 35; fiber = fiber.return, n++) {
      if (fiber.ref?.current?.getSnapshot) return true;
    }
    return false;
  });
  await page.evaluate(() => {
    if (window.__asciiWaves || window.__asciiWavesReact) {
      window.__auditApi = window.__asciiWaves || window.__asciiWavesReact;
      return;
    }
    const node = document.querySelector('[data-ascii-waves]');
    let fiber = node[Object.keys(node).find((key) => key.startsWith('__reactFiber'))];
    for (let n = 0; fiber && n < 35; fiber = fiber.return, n++) {
      if (fiber.ref?.current?.getSnapshot) {
        window.__auditApi = fiber.ref.current;
        return;
      }
    }
    throw new Error('Preserved imperative handle is not available');
  });
}

export async function installObservers(context) {
  await context.addInitScript(() => {
    window.__auditEvents = [];
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (...args) {
      // Only controlled still captures set this. Native paths and free-running
      // motion/performance never hold the browser's media clock.
      if (window.__auditHoldVideo) return Promise.resolve();
      return play.apply(this, args);
    };
    for (const name of ['loadedmetadata', 'seeked', 'playing', 'pause', 'error']) {
      document.addEventListener(name, (event) => {
        if (!(event.target instanceof HTMLVideoElement)) return;
        const v = event.target;
        window.__auditEvents.push({ event: name, now: performance.now(), time: v.currentTime, src: v.currentSrc, paused: v.paused });
        if (name === 'loadedmetadata') queueMicrotask(() => window.__auditEvents.push({ event: 'metadata-after-handler', now: performance.now(), time: v.currentTime, src: v.currentSrc }));
      }, true);
    }
  });
}

export async function state(page) {
  return page.evaluate(() => {
    const api = window.__auditApi;
    const canvas = document.querySelector('[data-ascii-waves] canvas') || document.querySelector('canvas.waves-canvas');
    const rect = canvas?.getBoundingClientRect();
    const stage = document.querySelector('[data-ascii-stage]');
    const poster = stage?.querySelector('img');
    const media = document.querySelector('video');
    return {
      snapshot: api?.getSnapshot(), metrics: api?.getMetrics(),
      video: api?.getVideoState?.() || api?.getVideo?.(),
      canvas: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height, backingWidth: canvas.width, backingHeight: canvas.height } : null,
      devicePixelRatio, viewport: [innerWidth, innerHeight],
      fontSmoothing: getComputedStyle(document.body).webkitFontSmoothing,
      stage: stage ? { ...stage.dataset } : null,
      poster: poster ? { complete: poster.complete, naturalWidth: poster.naturalWidth, display: getComputedStyle(poster).display, opacity: getComputedStyle(poster).opacity, zIndex: getComputedStyle(poster).zIndex } : null,
      actualVideo: media ? { time: media.currentTime, paused: media.paused, src: media.currentSrc, readyState: media.readyState, playbackRate: media.playbackRate, muted: media.muted, loop: media.loop, frames: media.getVideoPlaybackQuality?.() } : null,
      events: window.__auditEvents,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

export async function open(browser, { variant, viewport = { width: 1440, height: 900 }, dpr = 2, path = '/', query = '', normalized = false, reducedMotion = 'no-preference', touch = false }) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: dpr, reducedMotion, hasTouch: touch, isMobile: touch });
  await installObservers(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', message: error.message }));
  page.on('console', (message) => { if (message.type() === 'error') errors.push({ type: 'console', message: message.text() }); });
  page.on('requestfailed', (request) => errors.push({ type: 'requestfailed', url: request.url(), message: request.failure()?.errorText }));
  const url = config.origins[variant] + path + query;
  await page.goto(url, { waitUntil: 'networkidle' });
  const stage = page.locator('[data-ascii-stage]');
  if (await stage.count()) await stage.scrollIntoViewIfNeeded();
  await attachApi(page);
  await page.waitForFunction(() => window.__auditApi.getMetrics()?.videoEnabled === true);
  await page.bringToFront();
  if (normalized) {
    if (variant === 'golden' || variant === 'proof03') {
      await page.addStyleTag({ content: 'html{overflow:hidden!important}.field-scrim,[data-ui],.control-panel,.mobile-dock{display:none!important}' });
    } else if (variant === 'consolidated') {
      await page.addStyleTag({ content: `
        html{overflow:hidden!important;scrollbar-width:none!important}
        body *{visibility:hidden!important}
        [data-ascii-stage],[data-ascii-stage] *{visibility:visible!important}
        [data-ascii-stage]{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;min-height:0!important;z-index:2147483640!important}
        [data-ascii-stage]>img,[data-ascii-stage]>span{display:none!important}
      ` });
    }
    await page.waitForTimeout(700);
  }
  return { context, page, errors, url };
}

export async function pose(page, { videoTime, waveClock, pointer = null }) {
  await page.evaluate(async ({ waveClock, pointer }) => {
    const api = window.__auditApi;
    window.__auditHoldVideo = false;
    await api.play();
    api.setFrozenTime(waveClock);
    if (pointer) api.setPointer(pointer[0], pointer[1], true);
    else api.setPointer(.5, .5, false);
  }, { waveClock, pointer });
  // Let the original damped pointer converge; do not assign internal state.
  await page.waitForTimeout(2600);
  await page.evaluate(async ({ videoTime, waveClock }) => {
    const api = window.__auditApi;
    window.__auditHoldVideo = true;
    api.pause();
    await api.seek(videoTime);
    api.setFrozenTime(waveClock);
    api.markVideoDirty?.();
  }, { videoTime, waveClock });
  await page.waitForTimeout(100);
  return state(page);
}

export async function screenshot(page, name) {
  const path = resolve(out, 'screenshots', name + '.png');
  await page.screenshot({ path, scale: 'css' });
  return path;
}

export async function cdpReceipt(browser, page) {
  const cdp = await page.context().newCDPSession(page);
  const browserSession = await browser.newBrowserCDPSession();
  const [version, system, performance] = await Promise.all([
    cdp.send('Browser.getVersion'),
    browserSession.send('SystemInfo.getInfo'),
    cdp.send('Performance.enable').then(() => cdp.send('Performance.getMetrics')),
  ]);
  await browserSession.detach();
  await cdp.detach();
  return { capturedAt: new Date().toISOString(), launchOptions, version, system, performance };
}

export async function frameSample(page, durationMs = 6000) {
  return page.evaluate((durationMs) => new Promise((resolve) => {
    const api = window.__auditApi;
    const before = { snapshot: api.getSnapshot(), metrics: api.getMetrics(), video: document.querySelector('video').currentTime };
    const samples = [];
    let previous;
    let start;
    function tick(now) {
      start ??= now;
      if (previous !== undefined) samples.push(now - previous);
      previous = now;
      if (now - start < durationMs) requestAnimationFrame(tick);
      else {
        const sorted = [...samples].sort((a, b) => a - b);
        resolve({ durationMs: now - start, samples, fps: samples.length * 1000 / (now - start), medianMs: sorted[Math.floor(sorted.length * .5)], p95Ms: sorted[Math.floor(sorted.length * .95)], maxMs: sorted.at(-1), before, after: { snapshot: api.getSnapshot(), metrics: api.getMetrics(), video: document.querySelector('video').currentTime } });
      }
    }
    requestAnimationFrame(tick);
  }), durationMs);
}

mkdirSync(resolve(out, 'receipts'), { recursive: true });
