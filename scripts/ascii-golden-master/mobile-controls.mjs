import { resolve } from 'node:path';
import { launch, open, state, save, out } from './browser-common.mjs';

const browser = await launch();
const results = [];
try {
  for (const [name, path] of [['home', '/'], ['lab', '/lab/ascii-waves']]) {
    const p = await open(browser, { variant: 'consolidated', path, viewport: { width: 390, height: 844 }, dpr: 2, touch: true });
    await p.page.waitForFunction(() => document.querySelector('[data-ascii-stage]').dataset.playback === 'live');
    if (name === 'lab') {
      await p.page.getByLabel('Cell pitch', { exact: true }).selectOption('20');
      await p.page.getByLabel('Quality', { exact: true }).selectOption('efficient');
    }
    await p.page.getByRole('button', { name: name === 'home' ? 'Pause' : 'Motion', exact: true }).click();
    await p.page.waitForFunction(() => document.querySelector('[data-ascii-stage]').dataset.playback === 'paused');
    await p.page.waitForTimeout(600);
    const a = await state(p.page);
    await p.page.waitForTimeout(500);
    const b = await state(p.page);
    const image = resolve(out, 'screenshots', `final-${name}-mobile-full.png`);
    await p.page.screenshot({ path: image, fullPage: true, scale: 'css' });
    const pass = a.video.currentTime === b.video.currentTime && a.snapshot.waveClock === b.snapshot.waveClock && b.overflow === 0 && (name === 'home' || b.snapshot.cellSize === 20 && b.snapshot.dpr === 1);
    results.push({ name, a, b, pass, image, errors: p.errors });
    await p.context.close();
  }
  save('receipts/mobile-controls.json', { capturedAt: new Date().toISOString(), viewport: [390, 844], deviceDpr: 2, emulatedTouch: true, results });
  console.log(JSON.stringify(results.map(({ name, pass, errors }) => ({ name, pass, errors })), null, 2));
} finally {
  await browser.close();
}
if (results.some((r) => !r.pass || r.errors.length)) process.exitCode = 1;
