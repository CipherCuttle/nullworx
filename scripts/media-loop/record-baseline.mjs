import { webkit } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { observeMedia, timelineBoundaries, boundaries } from './observe.mjs';

// Run against an independently built checkout of 059db3d, never the repair.
const baseURL = process.env.BASELINE_URL ?? 'http://127.0.0.1:3201';
const out = resolve('evidence/webkit-media-loop-01');
mkdirSync(out, { recursive: true });
const browser = await webkit.launch({ headless: true });
const results = [];
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile });
    try {
      await context.addInitScript(observeMedia);
      const page = await context.newPage();
      await page.goto(baseURL);
      await page.locator('[data-ascii-stage]').scrollIntoViewIfNeeded();
      await page.waitForTimeout(8000);
      const data = await page.evaluate(() => ({ ...window.__mediaLoop, text: document.querySelector('[data-home-field]').innerText }));
      results.push({ mobile, ...data, timelineBoundaries: timelineBoundaries(data.samples), frameTimeBoundaries: boundaries(data.frames) });
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
writeFileSync(resolve(out, 'original-application.json'), JSON.stringify({ capturedAt: new Date().toISOString(), head: '059db3d13bd73d2a09f48d2060dd56014e0ab3fb', baseURL, version: browser.version(), results }, null, 2) + '\n');
console.log(JSON.stringify(results.map(r => ({ mobile: r.mobile, timelineBoundaries: r.timelineBoundaries.length, frameTimeBoundaries: r.frameTimeBoundaries.length, final: r.samples.at(-1) })), null, 2));
if (results.some(r => r.samples.at(-1).phase !== 'blocked' || !r.samples.at(-1).paused || r.timelineBoundaries.length)) process.exitCode = 1;
