import { launch, open, pose, save, screenshot, state, installObservers, attachApi, config } from './browser-common.mjs';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { out } from './browser-common.mjs';

const browser = await launch();
const onlyDpr1 = process.argv[2] === 'dpr1';
const result = onlyDpr1
  ? { ...JSON.parse(readFileSync(resolve(out, 'receipts/final-extras.json'))), dpr1: [], dpr1CapturedAt: new Date().toISOString() }
  : { capturedAt: new Date().toISOString(), dpr1: [], compatibility: [], finalSmoke: [] };
try {
  for (const variant of ['golden', 'consolidated']) {
    const p = await open(browser, { variant, normalized: true, dpr: 1, query: variant === 'golden' ? '?chrome=0&paused=1' : '' });
    const captured = await pose(p.page, { videoTime: 3.2, waveClock: 1 });
    const image = await screenshot(p.page, `final-dpr1-${variant}`);
    result.dpr1.push({ variant, state: captured, image, errors: p.errors });
    await p.context.close();
  }
  if (!onlyDpr1) for (const path of ['/', '/lab/ascii-waves']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    await installObservers(context);
    await context.addInitScript(() => {
      const canPlay = HTMLMediaElement.prototype.canPlayType;
      HTMLMediaElement.prototype.canPlayType = function (type) {
        if (type.includes('video/mp4')) return '';
        return canPlay.call(this, type);
      };
    });
    const page = await context.newPage();
    await page.goto(config.origins.consolidated + path);
    await page.locator('[data-ascii-stage]').scrollIntoViewIfNeeded();
    await attachApi(page);
    await page.waitForFunction(() => document.querySelector('[data-ascii-stage]').dataset.playback === 'live');
    const captured = await state(page);
    result.compatibility.push({ path, method: 'Force the codec-probe result to lack H.264; native Chrome VP9 decode then exercises the existing fallback. This is not a WebKit test or proof of MP4/VP9 visual equality.', state: captured, pass: captured.video.src.endsWith('/media/flower.webm') && captured.events.some((e) => e.event === 'seeked' && Math.abs(e.time - 2.2) < .03) });
    await context.close();
  }
  if (!onlyDpr1) for (const path of ['/', '/lab/ascii-waves']) {
    const p = await open(browser, { variant: 'consolidated', path });
    await p.page.waitForFunction(() => document.querySelector('[data-ascii-stage]').dataset.playback === 'live');
    const captured = await state(p.page);
    const text = await p.page.locator('main').innerText();
    result.finalSmoke.push({ path, state: captured, pass: captured.events.some((e) => e.event === 'seeked' && Math.abs(e.time - 2.2) < .03) && (path === '/' || text.includes('Motion off holds the video and wave clock while the pointer eddy')), errors: p.errors });
    await p.context.close();
  }
  save('receipts/final-extras.json', result);
  console.log(JSON.stringify({ dpr1: result.dpr1.map((d) => ({ variant: d.variant, canvas: d.state.canvas, errors: d.errors })), compatibility: result.compatibility.map(({ path, pass }) => ({ path, pass })), finalSmoke: result.finalSmoke.map(({ path, pass, errors }) => ({ path, pass, errors })) }, null, 2));
} finally {
  await browser.close();
}
if (result.compatibility.some((r) => !r.pass) || result.finalSmoke.some((r) => !r.pass || r.errors.length)) process.exitCode = 1;
