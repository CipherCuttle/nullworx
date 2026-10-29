import { chromium } from "playwright-core";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--use-gl=angle","--use-angle=gl","--ignore-gpu-blocklist"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await context.newPage();
await page.goto("http://127.0.0.1:3100/labs/composition", { waitUntil: "networkidle" });
const out = {};
for (const letter of ["b", "d"]) {
  await page.locator(`[data-testid="preset-${letter}"]`).click();
  await page.waitForTimeout(1400);
  out[letter] = await page.evaluate(() => {
    const canvas = document.querySelector('[data-surface="paper"] canvas');
    const stage = document.querySelector('[data-testid="composition-stage-inner"]');
    const mask = document.querySelector('div[data-paper-shader]')?.parentElement;
    const rect = canvas?.getBoundingClientRect();
    const stageRect = stage?.getBoundingClientRect();
    const computed = mask ? getComputedStyle(mask) : null;
    return {
      dpr: window.devicePixelRatio,
      canvas: canvas ? { width: canvas.width, height: canvas.height, cssWidth: rect.width, cssHeight: rect.height } : null,
      stage: stageRect ? { width: stageRect.width, height: stageRect.height } : null,
      mask: computed ? { image: computed.maskImage.slice(0, 60), size: computed.maskSize, repeat: computed.maskRepeat, position: computed.maskPosition, mode: computed.maskMode } : null,
      maskImageNatural: (() => { const img = document.querySelector('[data-testid="mask-reference"]'); return img ? { width: img.naturalWidth, height: img.naturalHeight } : null; })(),
    };
  });
}
await writeFile("evidence/g3a1/gpu/canvas-resolution.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
await browser.close();
