import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--use-gl=angle","--use-angle=gl","--ignore-gpu-blocklist"] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
const page = await context.newPage();
await page.goto("http://127.0.0.1:3100/labs/composition", { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="composition-lab"]');
await mkdir("evidence/g3a1/gpu/stills", { recursive: true });
const states = {};
for (const letter of ["a","b","c","d"]) {
  await page.locator(`[data-testid="preset-${letter}"]`).click();
  await page.waitForTimeout(1400);
  await page.locator('[data-testid="composition-stage-inner"]').screenshot({ path: `evidence/g3a1/gpu/stills/reduced-motion-${letter}.png` });
  states[letter] = await page.evaluate(() => ({
    effective: document.querySelector('[data-testid="effective-state"]')?.textContent,
    reduced: document.querySelector("[data-surface]")?.getAttribute("data-reduced"),
    speed: document.querySelector("div[data-paper-shader]")?.paperShaderMount?.speed ?? null,
    animated: document.querySelector("[data-surface]")?.getAttribute("data-animated"),
    rafActive: window.__rafActive?.size ?? null,
  }));
}
console.log(JSON.stringify(states, null, 2));
await browser.close();
