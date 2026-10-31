import { chromium, firefox, webkit } from '@playwright/test';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { observeMedia, presentedBoundaries, pictureBoundaries } from './observe.mjs';
import { cyclicSourceScript, sourceStartFrameHashes, showsSourceStart } from './browser-media.mjs';

export async function verifyReelLoops({ check }) {
  const root = resolve(import.meta.dirname, '../..');
  const out = resolve(root, 'evidence/seamless-demos-2026-10-30');
  mkdirSync(out, { recursive: true });
  const delivery = JSON.parse(readFileSync(resolve(out, 'delivery.json')));
  check('reels: all five existing demo clips are required', delivery.reels.map(reel => reel.name).sort().join(',') === 'flower,jellyfish,koi,orion,smoke', delivery.reels.map(reel => reel.name));
  const checksums = delivery.reels.flatMap(reel => reel.outputs.map(output => ({ file: output.file, expected: output.sha256, actual: createHash('sha256').update(readFileSync(resolve(root, output.file))).digest('hex') })));
  check('reels: every delivery file matches its fidelity receipt', checksums.length === 10 && checksums.every(row => row.expected === row.actual), checksums);
  check('reels: delivery encodes meet measured fidelity gate', delivery.pass, delivery.reels.map(r => ({ name: r.name, outputs: r.outputs })));
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      const file = url.searchParams.get('src');
      const reel = delivery.reels.find(r => file.includes('/' + r.name + '.'));
      const mime = reel.outputs.find(output => output.file === 'public' + file).mime;
      res.end(`<!doctype html><html><meta charset="utf-8"><title>Continuous cyclic media proof</title><video muted playsinline width="480" height="270" data-loop-mode="buffered" data-cycle-duration="${reel.duration}"></video><script>const v=document.querySelector('video');v.muted=true;v.addEventListener('canplay',()=>v.play(),{once:true});window.__loop = window.__createCyclicMediaSource({file:${JSON.stringify(file)},mime:${JSON.stringify(mime)},duration:${reel.duration},getVideo:()=>v,onError:error=>{window.__mediaError=error.message}});v.src=window.__loop.url;</script></html>`);
      return;
    }
    if (!/^\/media\/loops\/(flower|jellyfish|koi|smoke|orion)\.(mp4|webm)$/.test(url.pathname)) { res.writeHead(404); res.end(); return; }
    const path = resolve(root, 'public' + url.pathname), size = statSync(path).size;
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(range ? 206 : 200, { 'Content-Type': path.endsWith('mp4') ? 'video/mp4' : 'video/webm', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) });
    createReadStream(path, { start, end }).pipe(res);
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const results = [];
  try {
    const engines = await Promise.allSettled([['chromium', chromium, { channel: 'chrome' }], ['firefox', firefox, {}], ['webkit', webkit, {}]].map(async ([name, engine, options]) => {
      const browser = await engine.launch({ headless: true, ...options });
      try {
        // One visible reel per engine, as in the actual demo. Avoid turning
        // presentation fidelity into a five-decoder contention benchmark.
        for (const reel of delivery.reels) {
          const context = await browser.newContext();
          const label = `reels/${name}/${reel.name}`;
          try {
            await context.addInitScript(observeMedia);
            await context.addInitScript({ content: cyclicSourceScript });
            const page = await context.newPage();
            const ext = name === 'webkit' || reel.name === 'flower' ? 'webm' : 'mp4';
            await page.goto(`${origin}/?src=/media/loops/${reel.name}.${ext}`);
            await page.waitForFunction(() => document.querySelector('video').readyState >= 2 && !document.querySelector('video').paused, null, { timeout: 15_000 });
            const [numerator, denominator = 1] = reel.fps.split('/').map(Number);
            const firstFrameHashes = await sourceStartFrameHashes(page, `/media/loops/${reel.name}.${ext}`, numerator / denominator, { mime: reel.outputs.find(output => output.file.endsWith('.' + ext)).mime, duration: reel.duration });
            await page.waitForTimeout(Math.ceil((reel.duration * 3 + 1.2) * 1000));
            const data = await page.evaluate(() => structuredClone(window.__mediaLoop));
            const { wraps, basis } = pictureBoundaries(data);
          const notifications = presentedBoundaries(data);
            // This fixture starts at the real source beginning, with no seek.
            // A separately held MSE reference enumerates every prefix picture,
            // independent of compositor cadence and of this modulo clock.
            const beginning = data.frames.filter(frame => frame.time < .08);
            check(`${label}: reference is the actual initial source beginning`, beginning.length >= 1 && beginning[0].time <= .04 && data.seeks.length === 0, { beginning, firstFrameHashes });
            check(`${label}: presented notifications also cross three cycles`, notifications.wraps.length >= 3, notifications);
            check(`${label}: three real source cycle boundaries`, wraps.length >= 3 && wraps.every(w => w.from > reel.duration - .4 && w.to < .4), { basis, wraps });
            for (let i = 0; i < 3; i++) {
              const wrap = wraps[i];
              const frames = wrap ? data.frames.filter(f => f.at > wrap.at + 200 && f.at < wrap.at + 1000) : [];
              check(`${label}: animated after loop ${i + 1}`, frames.length >= 8 && new Set(frames.map(f => f.hash)).size >= 5, { frames: frames.length, hashes: new Set(frames.map(f => f.hash)).size });
              const start = wrap ? Math.max(1, wrap.index - 3) : 0;
              const gaps = wrap ? data.pictures.slice(start, wrap.index + 4).map((f, j) => Math.max(f.sampleGap, f.at - data.pictures[start + j - 1].at)) : [];
              check(`${label}: continuous frame delivery at seam ${i + 1}`, gaps.length >= 4 && Math.max(...gaps) <= 80, { gapsMs: gaps, limitMs: 80 });
              check(`${label}: actual clip beginning is presented at seam ${i + 1}`, showsSourceStart({ frames: data.pictures }, wrap, firstFrameHashes), { expectedBeginningFrameHashes: firstFrameHashes, first: wrap ? data.pictures.slice(wrap.index, wrap.index + 3) : null });
            }
            check(`${label}: no source reload or repeated play recovery`, data.events.filter(e => e.event === 'loadedmetadata').length === 1 && data.playCalls === 1, { calls: data.playCalls, metadata: data.events.filter(e => e.event === 'loadedmetadata').length });
            const stats = await page.evaluate(() => ({ ...window.__loop.stats, error: window.__mediaError ?? null }));
            check(`${label}: bounded source buffer and one fetch`, !stats.error && stats.fetches === 1 && stats.removals >= 1 && stats.cycles <= 7 && stats.bufferedSeconds <= reel.duration + 3.2, stats);
            const row = { engine: name, version: browser.version(), reel: reel.name, source: `/media/loops/${reel.name}.${ext}`, basis, firstFrameHashes, wraps, data };
            writeFileSync(resolve(out, `${name}-${reel.name}.json`), JSON.stringify(row, null, 2) + '\n');
            results.push({ ...row, data: undefined });
          } catch (error) { check(`${label}: completes native playback proof`, false, String(error)); }
          finally { await context.close(); }
        }
      } finally { await browser.close(); }
    }));
    for (const engine of engines) if (engine.status === 'rejected') throw engine.reason;
  } finally { server.close(); }
  writeFileSync(resolve(out, 'browser-loops.json'), JSON.stringify({ capturedAt: new Date().toISOString(), results }, null, 2) + '\n');
  return results;
}
