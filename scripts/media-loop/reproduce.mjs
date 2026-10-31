import { chromium, firefox, webkit } from '@playwright/test';
import { createServer } from 'node:http';
import { createReadStream, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { observeMedia, boundaries, timelineBoundaries } from './observe.mjs';

const root = resolve(import.meta.dirname, '../..');
const out = resolve(root, 'evidence/webkit-media-loop-01');
mkdirSync(out, { recursive: true });
// Serve the original bytes with HTTP range support, like Next's static server.
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(readFileSync(resolve(import.meta.dirname, 'fixture.html')));
  } else if (/^\/media\/flower\.(webm|mp4)$/.test(path)) {
    const file = resolve(root, 'public' + path);
    const size = statSync(file).size;
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(range ? 206 : 200, {
      'Content-Type': path.endsWith('webm') ? 'video/webm' : 'video/mp4',
      'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1,
      ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
    });
    createReadStream(file, { start, end }).pipe(res);
  } else { res.writeHead(404); res.end(); }
});
await new Promise(done => server.listen(0, '127.0.0.1', done));
const origin = `http://127.0.0.1:${server.address().port}`;
const results = [];
try {
  const settled = await Promise.allSettled([
    ['chromium', chromium, { channel: 'chrome' }], ['firefox', firefox, {}], ['webkit', webkit, {}],
  ].map(async ([name, engine, options]) => {
    const browser = await engine.launch({ headless: true, ...options });
    try {
      const cases = await Promise.allSettled([
        ['native', 'webm'], ['ended', 'webm'], ['seeked', 'webm'], ['controlled', 'webm'], ['native', 'mp4'],
      ].map(async ([mode, format]) => {
        const context = await browser.newContext();
        try {
          await context.addInitScript(observeMedia);
          const page = await context.newPage();
          await page.goto(`${origin}/?mode=${mode}&format=${format}`);
          await page.waitForTimeout(18_000);
          const data = await page.evaluate(() => ({ ...window.__mediaLoop, fixture: window.fixture, userAgent: navigator.userAgent, source: document.querySelector('video').currentSrc, error: document.querySelector('video').error?.message ?? null }));
          const wraps = boundaries(data.frames);
          const clockWraps = timelineBoundaries(data.samples);
          const row = { engine: name, version: browser.version(), mode, format, ...data, frameTimeBoundaries: wraps, timelineBoundaries: clockWraps };
          results.push(row);
          console.log(JSON.stringify({ engine: name, version: row.version, mode, format, frameTimeBoundaries: wraps.length, timelineBoundaries: clockWraps.length, frames: data.frames.length, last: data.samples.at(-1), error: data.error }));
        } finally { await context.close(); }
      }));
      for (const c of cases) if (c.status === 'rejected') throw c.reason;
    } finally { await browser.close(); }
  }));
  for (const row of settled) if (row.status === 'rejected') throw row.reason;
} finally {
  server.close();
  writeFileSync(resolve(out, 'isolated-reproduction.json'), JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2) + '\n');
}
