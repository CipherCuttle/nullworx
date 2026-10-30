import { launch, open, pose, screenshot, state, save, cdpReceipt } from './browser-common.mjs';

const phase = process.argv[2] || 'after';
const browser = await launch();
const receipt = { capturedAt: new Date().toISOString(), phase, method: 'Actual archived app and actual consolidated routes. Raw pairs temporarily hide chrome/scrims and expand existing stage with browser-only CSS. No renderer edits.', cases: [], errors: [] };
try {
  for (const [name, variant, path] of [['golden', 'golden', '/'], ['home', 'consolidated', '/'], ['lab', 'consolidated', '/lab/ascii-waves']]) {
    for (const mobile of [false, true]) {
      const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
      const p = await open(browser, { variant, path, viewport, dpr: 2, touch: mobile, query: variant === 'golden' ? '/'.slice(1) : '' });
      await p.page.waitForTimeout(650);
      const native = await state(p.page);
      const image = await screenshot(p.page, `${phase}-${name}-${mobile ? 'mobile' : 'desktop'}-native`);
      receipt.cases.push({ name, type: 'native', viewport, dpr: 2, url: p.url, state: native, image, errors: p.errors });
      if (name === 'home' && !mobile) receipt.cdp = await cdpReceipt(browser, p.page);
      await p.context.close();
    }
  }
  for (const mobile of [false, true]) {
    const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
    const poses = mobile ? [{ videoTime: 2.7, waveClock: .5 }, { videoTime: 4.2, waveClock: 2 }] : [
      { videoTime: 2.2, waveClock: 0 }, { videoTime: 2.7, waveClock: .5 },
      { videoTime: 3.2, waveClock: 1 }, { videoTime: 4.2, waveClock: 2 },
      { videoTime: 3.2, waveClock: 1, pointer: [.7, .35] },
    ];
    for (const variant of ['golden', 'consolidated']) {
      const p = await open(browser, { variant, viewport, dpr: 2, normalized: true, query: variant === 'golden' ? '?chrome=0&paused=1' : '' });
      for (let i = 0; i < poses.length; i++) {
        const measured = await pose(p.page, poses[i]);
        const image = await screenshot(p.page, `${phase}-raw-${variant}-${mobile ? 'mobile' : 'desktop'}-${i}`);
        receipt.cases.push({ name: variant, type: 'matched-raw', viewport, dpr: 2, pose: poses[i], index: i, state: measured, image, errors: [...p.errors] });
      }
      await p.context.close();
    }
  }
  receipt.errors = receipt.cases.flatMap((c) => c.errors);
  save(`receipts/captures-${phase}.json`, receipt);
  console.log(JSON.stringify({ phase, cases: receipt.cases.length, errors: receipt.errors }, null, 2));
} finally {
  await browser.close();
}
