import { chromium, firefox, webkit } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { observeMedia, presentedBoundaries, pictureBoundaries } from './observe.mjs';
import { verifyReelLoops } from './verify-reels.mjs';
import { sourceStartFrameHashes, showsSourceStart } from './browser-media.mjs';

const out = resolve('evidence/webkit-media-loop-01');
const read = page => page.evaluate(() => structuredClone(window.__mediaLoop));
const waitPhase = async (page, phase) => {
  try {
    await page.waitForFunction(phase => document.querySelector('[data-ascii-stage]')?.dataset.playback === phase, phase, { timeout: 15_000 });
  } catch (error) {
    const state = await page.evaluate(() => {
      const stage = document.querySelector('[data-ascii-stage]'), v = document.querySelector('video');
      return { phase: stage?.dataset.playback, scroll: scrollY, rect: stage?.getBoundingClientRect().toJSON(), time: v?.currentTime, paused: v?.paused, seeking: v?.seeking, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, hidden: document.hidden };
    });
    throw new Error(`Expected ${phase}: ${JSON.stringify(state)}; ${error.message}`);
  }
};
const forceVP9 = () => {
  const canPlay = HTMLMediaElement.prototype.canPlayType;
  HTMLMediaElement.prototype.canPlayType = function (type) { return type.includes('video/mp4') ? '' : canPlay.call(this, type); };
};

async function stallAndRestart(page, label, check) {
  // Stop a successfully playing decoder while preserving the component's intent.
  // This negative control must say stalled, and must not retry on a timer.
  await page.evaluate(() => { const v = document.querySelector('video'); v.play = () => { window.__mediaLoop.playCalls++; return Promise.resolve(); }; v.pause(); });
  await waitPhase(page, 'stalled');
  const before = await read(page);
  await page.waitForTimeout(1500);
  const after = await read(page);
  const status = await page.locator('[data-ascii-stage]').getAttribute('data-playback-reason');
  const restart = page.getByRole('button', { name: /^Restart live field/ });
  check(`${label}: successful playback then stall is never autoplay-blocked`, status === 'playback-stalled' && await restart.isVisible() && !await page.getByText('AUTOPLAY BLOCKED / START', { exact: true }).count(), status);
  check(`${label}: stalled playback has no automatic retry loop`, before.playCalls === after.playCalls && before.seeks.length === after.seeks.length, { before: before.samples.at(-1), after: after.samples.at(-1) });
  await page.evaluate(() => { delete document.querySelector('video').play; });
  await restart.click();
  await waitPhase(page, 'live');
}

export async function lifecycle(page, label, check) {
  const results = [];
  const button = name => page.getByRole('button', { name, exact: true });
  async function held(phase, method, enter, leave) {
    await enter();
    await waitPhase(page, phase);
    await page.waitForTimeout(300);
    const before = await read(page);
    await page.waitForTimeout(1500);
    const after = await read(page);
    const a = before.samples.at(-1), b = after.samples.at(-1);
    const detail = { method, before: a, after: b, plays: after.playCalls - before.playCalls, seeks: after.seeks.length - before.seeks.length, frames: after.frames.length - before.frames.length };
    check(`${label}: ${phase} holds without recovery`, b.phase === phase && Math.abs(a.currentTime - b.currentTime) < .05 && detail.plays === 0 && detail.seeks === 0 && detail.frames <= 1, detail);
    results.push({ phase, ...detail });
    await leave();
    await waitPhase(page, 'live');
  }
  // Pause close to EOF and hold beyond the time at which it would have looped.
  await page.waitForFunction(() => {
    const stage = document.querySelector('[data-ascii-stage]'), v = document.querySelector('video');
    const time = Number(stage.dataset.videoTime);
    const period = Number(stage.dataset.cycleDuration);
    return time > period - .7 && time < period - .15;
  });
  await held('paused', 'Visitor Pause button near EOF', () => button('Pause').click(), () => button('Play').click());
  await held('reduced', 'Native matchMedia emulation', () => page.emulateMedia({ reducedMotion: 'reduce' }), () => page.emulateMedia({ reducedMotion: 'no-preference' }));
  await held('offscreen', 'Real scrolling and IntersectionObserver, with temporary scroll space', () => page.evaluate(() => {
    const spacer = document.createElement('div'); spacer.id = '__loopVisibilitySpacer'; spacer.style.height = '150vh'; document.body.append(spacer);
    window.scrollTo(0, document.body.scrollHeight);
  }), async () => {
    await page.evaluate(() => document.querySelector('#__loopVisibilitySpacer').remove());
    await page.locator('[data-ascii-stage]').scrollIntoViewIfNeeded();
  });
  await held('hidden', 'Labelled document.hidden getter + visibilitychange injection; not a native OS background claim', () => page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  }), () => page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  }));
  {
    // Pause on the first presented frame of a real source cycle boundary.
    // The subsequent duplicate events are only an adversarial negative control.
    await page.evaluate(() => {
      const v = document.querySelector('video');
      const period = Number(document.querySelector('[data-ascii-stage]').dataset.cycleDuration);
      let previousTime = NaN, previousClock = v.currentTime;
      const pauseAtLoop = (now, metadata) => {
        const position = metadata.mediaTime % period;
        const wrapped = previousTime - position > 1 || previousClock - v.currentTime > 1;
        previousTime = position;
        previousClock = v.currentTime;
        if (wrapped) document.querySelector('[data-home-field] button').click();
        else v.requestVideoFrameCallback(pauseAtLoop);
      };
      v.requestVideoFrameCallback(pauseAtLoop);
    });
    await waitPhase(page, 'paused');
    await page.waitForTimeout(300);
    const before = await read(page);
    await page.evaluate(() => { for (let n = 0; n < 10; n++) document.querySelector('video').dispatchEvent(new Event('ended')); });
    await page.waitForTimeout(1500);
    const after = await read(page);
    check(`${label}: pause at real loop boundary holds through duplicate ends`, after.playCalls === before.playCalls && after.seeks.length === before.seeks.length && after.samples.at(-1).paused && after.samples.at(-1).phase === 'paused', { before: before.samples.at(-1), after: after.samples.at(-1), extraPlays: after.playCalls - before.playCalls, extraSeeks: after.seeks.length - before.seeks.length });
    await button('Play').click();
    await waitPhase(page, 'live');
  }
  await stallAndRestart(page, label, check);
  return results;
}

export async function verifyMediaLoops({ baseURL, check }) {
  mkdirSync(out, { recursive: true });
  const cases = [];
  const checks = [];
  const report = check;
  check = (name, pass, detail) => {
    checks.push({ name, pass: Boolean(pass), detail });
    report(name, pass, detail);
  };
  const engines = [
    ['chromium', chromium, { channel: 'chrome', args: ['--use-gl=angle', '--use-angle=gl', '--ignore-gpu-blocklist', '--enable-gpu'] }],
    ['firefox', firefox, {}], ['webkit', webkit, {}],
  ];
  for (const [engineName, engine, options] of engines) {
    const browser = await engine.launch({ headless: true, ...options });
    try {
      const matrix = [
        { path: '/', mobile: false }, { path: '/', mobile: true },
        ...(engineName !== 'webkit' ? [{ path: '/', mobile: false, vp9: true }] : [{ path: '/lab/ascii-waves', mobile: false }]),
      ];
      for (const entry of matrix) {
        const label = `media/${engineName}/${entry.mobile ? 'mobile' : 'desktop'}/${entry.path === '/' ? 'home' : 'lab'}${entry.vp9 ? '/forced-vp9' : ''}`;
        const context = await browser.newContext({ viewport: entry.mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: entry.mobile ? 2 : 1, isMobile: entry.mobile, hasTouch: entry.mobile, reducedMotion: 'no-preference' });
        const errors = [];
        const row = { label, engine: engineName, version: browser.version(), ...entry };
        try {
          await context.addInitScript(observeMedia);
          if (entry.vp9) await context.addInitScript(forceVP9);
          const page = await context.newPage();
          page.on('pageerror', error => errors.push(error.message));
          page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
          await page.goto(baseURL + entry.path, { waitUntil: 'networkidle' });
          await page.locator('[data-ascii-stage]').scrollIntoViewIfNeeded();
          await waitPhase(page, 'live');
          await page.evaluate(() => { window.__loopCanvas = document.querySelector('[data-ascii-stage] canvas'); window.__loopVideo = document.querySelector('video'); });
          // Duration determines the observation, while actual source wraps and
          // post-boundary frames determine success. Never fake or seek a loop.
          const media = await page.locator('[data-ascii-stage]').evaluate(stage => ({ duration: Number(stage.dataset.cycleDuration), src: stage.dataset.sourceUrl, mode: stage.dataset.loopMode }));
          const mime = media.src.endsWith('.webm') ? 'video/webm; codecs=\"vp9\"' : 'video/mp4; codecs=\"avc1.64001F\"';
          const firstFrameHashes = await sourceStartFrameHashes(page, media.src, 30000 / 1001, { mime, duration: media.duration });
          const initialOffset = entry.path === '/' ? 1 : 2.2;
          await page.waitForTimeout(Math.ceil((media.duration * 3 + 1.2) * 1000));
          const data = await read(page);
          const { wraps, basis } = pictureBoundaries(data);
          const notifications = presentedBoundaries(data);
          const duration = media.duration;
          const explicit = await page.locator('video').evaluate(v => !v.loop);
          row.nativeLoop = !explicit;
          row.boundaryClock = basis;
          row.initialOffset = initialOffset;
          row.boundaries = wraps;
          const initial = data.seeks[0]?.currentTime;
          check(`${label}: correct initial source offset`, Math.abs(initial - initialOffset) < .04, { initial, expected: initialOffset, source: media.src });
          check(`${label}: presented notifications also cross three cycles`, notifications.wraps.length >= 3, notifications);
          check(`${label}: at least THREE real source cycle boundaries`, wraps.length >= 3 && wraps.every(w => w.from > duration - .4 && w.to < .4), wraps);
          const firstLive = data.samples.find(s => s.phase === 'live')?.at ?? Infinity;
          const steady = data.samples.filter(s => s.at > firstLive + 700);
          // Cyclic buffered playback never seeks or pauses at the boundary.
          check(`${label}: genuinely LIVE throughout looping`, steady.length > 100 && steady.every(s => s.phase === 'live' && !s.paused && !s.seeking), { phases: [...new Set(steady.map(s => s.phase))], paused: steady.filter(s => s.paused), samples: steady.length });
          check(`${label}: wave clock never resets at a source boundary`, steady.length > 100 && steady.every((s, i) => !i || s.waveClock >= steady[i - 1].waveClock), { first: steady[0]?.waveClock, last: steady.at(-1)?.waveClock });
          for (let n = 0; n < 3; n++) {
            const w = wraps[n];
            const frames = w ? data.frames.filter(f => f.at > w.at + 200 && f.at < w.at + 1000) : [];
            const samples = w ? data.samples.filter(s => s.at > w.at + 200 && s.at < w.at + 1000) : [];
            check(`${label}: changing presented frames after loop ${n + 1}`, frames.length >= 8 && new Set(frames.map(f => f.hash)).size >= 5 && samples.length >= 4 && samples.at(-1).rendererFrames > samples[0].rendererFrames, { presented: frames.length, distinctDecodedHashes: new Set(frames.map(f => f.hash)).size, rendererFrames: samples.map(s => s.rendererFrames) });
            const adjacent = w ? data.pictures.slice(Math.max(1, w.index - 3), w.index + 4).map((frame, i) => Math.max(frame.sampleGap, frame.at - data.pictures[Math.max(1, w.index - 3) + i - 1].at)) : [];
            check(`${label}: no decoder freeze at seam ${n + 1}`, adjacent.length >= 4 && Math.max(...adjacent) <= 80, { gapsMs: adjacent, limitMs: 80, basis });
            check(`${label}: actual source beginning is presented at loop ${n + 1}`, showsSourceStart({ frames: data.pictures }, w, firstFrameHashes), { expectedBeginningFrameHashes: firstFrameHashes, first: w ? data.pictures.slice(w.index, w.index + 3) : null });
          }
          check(`${label}: no retry storm or source reload`, data.seeks.length <= wraps.length + 2 && data.playCalls <= wraps.length * 3 + 8 && data.events.filter(e => e.event === 'loadedmetadata').length === 1, { seeks: data.seeks.length, playCalls: data.playCalls, playEvents: data.plays, boundaries: wraps.length });
          check(`${label}: continuous cycles never reset playback or reapply initial offset`, media.mode === 'buffered' && explicit && data.seeks.length === 1, { mode: media.mode, htmlLoop: !explicit, seeks: data.seeks.map(s => s.currentTime) });
          const buffer = await page.locator('[data-ascii-stage]').evaluate(stage => ({ seconds: Number(stage.dataset.loopBufferSeconds), chunks: Number(stage.dataset.loopAppends), cycles: Number(stage.dataset.loopCycles), removals: Number(stage.dataset.loopRemovals), fetches: Number(stage.dataset.loopFetches) }));
          check(`${label}: bounded buffer with old frames evicted and one fetch`, buffer.seconds <= media.duration + 3.2 && buffer.removals >= 1 && buffer.fetches === 1 && buffer.cycles <= 7, buffer);
          check(`${label}: no autoplay-blocked status after success`, !data.samples.some(s => s.phase === 'blocked' || s.phase === 'stalled'), [...new Set(data.samples.map(s => s.phase))]);
          row.measurement = data;
          if (entry.path === '/' && !entry.mobile && (engineName === 'webkit' || entry.vp9)) row.lifecycle = await lifecycle(page, label, check);
          if (entry.path !== '/') await stallAndRestart(page, label, check);
          const final = await read(page);
          const identity = await page.evaluate(() => ({ canvas: window.__loopCanvas === document.querySelector('[data-ascii-stage] canvas'), video: window.__loopVideo === document.querySelector('video'), source: document.querySelector('video').currentSrc }));
          check(`${label}: same video and WebGL context through loops and controls`, identity.canvas && identity.video && final.contexts === 1 && final.lost === 0, { ...identity, contexts: final.contexts, lost: final.lost });
          check(`${label}: no application errors`, errors.length === 0, errors);
          row.final = final;
        } catch (error) {
          row.error = String(error);
          check(`${label}: completes real loop test`, false, String(error));
        } finally {
          row.errors = errors;
          writeFileSync(resolve(out, label.replaceAll('/', '-') + '.json'), JSON.stringify(row, null, 2) + '\n');
          cases.push({ ...row, measurement: undefined, final: undefined });
          await context.close();
        }
      }
      // A real NotAllowedError, independently of successful-playing stall tests.
      const context = await browser.newContext();
      try {
        await context.addInitScript(() => {
          const play = HTMLMediaElement.prototype.play;
          HTMLMediaElement.prototype.play = function (...args) {
            return window.__allowMedia ? play.apply(this, args) : Promise.reject(new DOMException('Test autoplay policy', 'NotAllowedError'));
          };
        });
        const page = await context.newPage();
        await page.goto(baseURL);
        await waitPhase(page, 'blocked');
        check(`media/${engineName}: actual policy rejection is autoplay-blocked`, await page.locator('[data-ascii-stage]').getAttribute('data-playback-reason') === 'autoplay-blocked', await page.locator('[data-ascii-stage]').getAttribute('data-playback-reason'));
        await page.evaluate(() => { window.__allowMedia = true; });
        await page.getByRole('button', { name: /Start live field/ }).click();
        await waitPhase(page, 'live');
        check(`media/${engineName}: explicit start recovers policy rejection`, true, 'live');
      } catch (error) { check(`media/${engineName}: policy rejection control`, false, String(error)); }
      finally { await context.close(); }
    } finally { await browser.close(); }
  }
  await verifyReelLoops({ check });
  const failed = checks.filter(c => !c.pass);
  writeFileSync(resolve(out, 'verification.json'), JSON.stringify({ capturedAt: new Date().toISOString(), checks, cases, passed: checks.length - failed.length, total: checks.length, failed }, null, 2) + '\n');
  return cases;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const checks = [];
  const cases = await verifyMediaLoops({ baseURL: process.env.BASE_URL ?? 'http://127.0.0.1:3200', check: (name, pass, detail) => {
    checks.push({ name, pass: Boolean(pass), detail });
    console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
  } });
  const failed = checks.filter(c => !c.pass);
  writeFileSync(resolve(out, 'verification.json'), JSON.stringify({ capturedAt: new Date().toISOString(), checks, cases, passed: checks.length - failed.length, total: checks.length, failed }, null, 2) + '\n');
  console.log(JSON.stringify({ passed: checks.length - failed.length, total: checks.length, failed }, null, 2));
  if (failed.length) process.exitCode = 1;
}
