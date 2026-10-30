import { resolve } from 'node:path';
import { launch, open, pose, save, out } from './browser-common.mjs';

const browser = await launch();
const captures = [];
try {
  for (const variant of ['golden', 'consolidated']) {
    const p = await open(browser, { variant, normalized: true, dpr: 2, query: variant === 'golden' ? '?chrome=0&paused=1' : '' });
    const state = await pose(p.page, { videoTime: 3.2, waveClock: 1 });
    const image = resolve(out, 'screenshots', `final-device2-${variant}.png`);
    await p.page.screenshot({ path: image, scale: 'device' });
    captures.push({ variant, state, image, errors: p.errors });
    await p.context.close();
  }
  save('receipts/device-pixels.json', { capturedAt: new Date().toISOString(), method: 'Native device-pixel screenshots; no downsampling. DPR2 1440x900 CSS / 2880x1800 PNG.', captures });
} finally {
  await browser.close();
}
