#!/usr/bin/env node
/**
 * Nullworx ASCII fidelity proof 01 — offline, still-frame hypotheses.
 *
 * A/B/C/D are intentionally Canvas2D mock-ups of cell-selection algorithms.
 * They are NOT replacements for the preserved WebGL renderer, nor GPU/perf
 * results. No clip or screenshot is modified or uploaded.
 *
 * Run while the local app serves its original media:
 * BASE_URL=http://127.0.0.1:3200 TIME=1.5 node scripts/ascii-fidelity/compare-stills.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3200';
const route = process.env.ROUTE ?? '/';
const output = resolve(process.env.OUTPUT_DIR ?? 'evidence/ascii-fidelity-proof-01/stills');
const targetTime = Number(process.env.TIME ?? 1.5);
const pitch = Number(process.env.PITCH ?? 8);
if (!Number.isFinite(targetTime) || targetTime < 0 || !Number.isInteger(pitch) || pitch < 6 || pitch > 20) {
  throw new Error('TIME must be nonnegative, and PITCH an integer from 6 to 20.');
}
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.CHANNEL || 'chrome' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(new URL(route, baseURL).href, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => Boolean(document.querySelector('[data-ascii-stage]')?.dataset.sourceUrl), null, { timeout: 20000 });
  const source = await page.locator('[data-ascii-stage]').getAttribute('data-source-url');
  if (!source || !/^\/|^https?:/.test(source)) throw new Error('A normal video source URL is required: ' + source);
  const result = await page.evaluate(async ({ source, targetTime, pitch }) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.crossOrigin = 'anonymous';
    video.src = source;
    try {
      await new Promise((resolve, reject) => {
        if (video.readyState >= 1) return resolve();
        video.addEventListener('loadedmetadata', resolve, { once: true });
        video.addEventListener('error', () => reject(new Error('Unable to decode ' + source)), { once: true });
      });
      const timestamp = Math.min(targetTime, Math.max(0, video.duration - .1));
      await new Promise((resolve, reject) => {
        if (Math.abs(video.currentTime - timestamp) < .01 && video.readyState >= 2) return resolve();
        video.addEventListener('seeked', resolve, { once: true });
        video.addEventListener('error', () => reject(new Error('Failed to seek reference clip')), { once: true });
        video.currentTime = timestamp;
      });
      if (video.readyState < 2) await new Promise(resolve => video.addEventListener('loadeddata', resolve, { once: true }));
      const width = 960;
      const height = Math.round(width * (video.videoHeight / video.videoWidth));
      if (!height || !video.videoWidth) throw new Error('No decoded video dimensions');
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = width; sourceCanvas.height = height;
      const srcContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
      srcContext.drawImage(video, 0, 0, width, height);
      const rgb = srcContext.getImageData(0, 0, width, height).data;
      const configurations = [
        { id: 'a-control', description: 'One-point sampling, original 10-glyph ramp', area: false, colorBoost: false, extended: false },
        { id: 'b-area', description: 'Four samples averaged per character cell', area: true, colorBoost: false, extended: false },
        { id: 'c-color', description: 'Original source RGB; hue-aware density signal', area: false, colorBoost: true, extended: false },
        { id: 'd-ramp', description: 'Experimental expanded, uncalibrated glyph ramp', area: false, colorBoost: false, extended: true },
      ];
      const sample = (x, y) => {
        const xx = Math.max(0, Math.min(width - 1, Math.floor(x)));
        const yy = Math.max(0, Math.min(height - 1, Math.floor(y)));
        const at = (yy * width + xx) * 4;
        return [rgb[at], rgb[at + 1], rgb[at + 2]];
      };
      const results = [];
      for (const variant of configurations) {
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height);
        ctx.font = '700 ' + Math.max(7, Math.round(pitch * .94)) + 'px "DejaVu Sans Mono", "Liberation Mono", monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const ramp = variant.extended ? ' .,:;irsXA253hMHGS#9B&@' : ' .:-+*=%@#';
        const bins = new Array(ramp.length).fill(0);
        for (let y = 0; y < height; y += pitch) {
          for (let x = 0; x < width; x += pitch) {
            let color;
            if (variant.area) {
              const samples = [[.25,.25],[.75,.25],[.25,.75],[.75,.75]]
                .map(([sx,sy]) => sample(x+sx*pitch,y+sy*pitch));
              color = [0,1,2].map(channel => samples.reduce((sum,s) => sum+s[channel],0)/4);
            } else {
              color = sample(x+.5*pitch, y+.5*pitch);
            }
            const [r,g,b] = color;
            const baseLuma = (.299*r+.587*g+.114*b)/255;
            // Test only glyph SELECTION exposure; ink uses unchanged RGB.
            const density = variant.colorBoost
              ? Math.min(1, Math.max(baseLuma, .32 * Math.max(r,g,b)/255))
              : baseLuma;
            const index = Math.max(0, Math.min(ramp.length-1, Math.floor(density*ramp.length)));
            bins[index] += 1;
            if (ramp[index] !== ' ') {
              ctx.fillStyle = 'rgb('+Math.round(r)+','+Math.round(g)+','+Math.round(b)+')';
              ctx.fillText(ramp[index], x + pitch/2, y + pitch/2);
            }
          }
        }
        results.push({
          ...variant, bins, width, height,
          image: canvas.toDataURL('image/png'),
        });
      }
      return {
        source, timestamp, width, height, pitch,
        videoWidth: video.videoWidth, videoHeight: video.videoHeight,
        sourceImage: sourceCanvas.toDataURL('image/png'),
        variants: results,
      };
    } finally {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
  }, { source, targetTime, pitch });
  const savePNG = (name, url) => {
    if (!url.startsWith('data:image/png;base64,')) throw new Error('Unexpected image encoding');
    writeFileSync(resolve(output, name), Buffer.from(url.slice('data:image/png;base64,'.length), 'base64'));
  };
  savePNG('source-reference.png', result.sourceImage);
  for (const row of result.variants) savePNG(row.id + '.png', row.image);
  const manifest = {
    runAt: new Date().toISOString(), input: result.source,
    video: [result.videoWidth,result.videoHeight], stage: [result.width,result.height],
    sourceTime: result.timestamp, pitch,
    note: 'Independent Canvas2D still studies; not the exact WebGL shader, not a dynamic loop or performance test. D glyph ramp is not yet coverage calibrated.',
    variants: result.variants.map(({ image, ...data }) => data),
  };
  writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  const imgs = ['source-reference','a-control','b-area','c-color','d-ramp'];
  writeFileSync(resolve(output, 'REVIEW.html'), '<!doctype html><html><meta charset="utf-8"><title>Nullworx ASCII Fidelity Proof 01</title><style>body{background:#101216;color:#fafafa;font:15px system-ui;padding:30px}img{max-width:100%;width:960px;display:block;image-rendering:auto}section{margin:35px 0}h2{font-size:18px}</style><h1>ASCII Fidelity Proof 01 · held source frame</h1><p>Isolated cell-selection hypotheses, not WebGL production output. Same source, size, pitch and timestamp across A/B/C/D.</p>'+imgs.map(x=>'<section><h2>'+x+'</h2><img src="'+x+'.png"></section>').join('')+'</html>');
  console.log(JSON.stringify({ output, source:result.source, timestamp:result.timestamp, variants:result.variants.map(x=>x.id) }, null, 2));
} finally {
  await browser.close();
}
