import { chromium } from "playwright-core";
import { writeFile, mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: false,
  args: ["--use-gl=angle", "--use-angle=gl", "--ignore-gpu-blocklist", "--disable-gpu-driver-bug-workarounds", "--window-size=1440,900"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.goto("http://127.0.0.1:3100/labs/composition", { waitUntil: "networkidle" });
await page.waitForSelector('[data-testid="composition-lab"]');
const renderer = await page.evaluate(() => {
  const c = document.createElement("canvas");
  const gl = c.getContext("webgl2");
  const e = gl?.getExtension("WEBGL_debug_renderer_info");
  return gl ? { webgl2: true, renderer: e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) } : { webgl2: false };
});
const measure = (ms) => page.evaluate((duration) => new Promise((resolve) => {
  const start = performance.now(); const values = []; let last = start;
  const tick = (t) => { values.push(t - last); last = t; if (t - start < duration) requestAnimationFrame(tick); else resolve(values); };
  requestAnimationFrame(tick);
}), ms);
const summarize = (d) => {
  const s=[...d].sort((a,b)=>a-b); const p=(q)=>s[Math.min(s.length-1,Math.floor(q*s.length))];
  const median = p(0.5);
  return {
    samples:d.length,
    medianMs:+median.toFixed(2),
    impliedHz: +(1000/median).toFixed(1),
    p95Ms:+p(0.95).toFixed(2),
    p99Ms:+p(0.99).toFixed(2),
    maxMs:+s[s.length-1].toFixed(2),
    over33ms:d.filter(v=>v>33.4).length,
    over50ms:d.filter(v=>v>50).length,
    over100ms:d.filter(v=>v>100).length,
  };
};
const out = { renderer, display: process.env.DISPLAY, session: process.env.XDG_SESSION_TYPE, window: await page.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio, screenWidth: screen.width, screenHeight: screen.height })), presets: {} };
for (const letter of ["a", "b", "c", "d"]) {
  await page.locator(`[data-testid="preset-${letter}"]`).click();
  await page.waitForTimeout(1500);
  const deltas = await measure(6000);
  out.presets[letter] = summarize(deltas);
  await page.locator('[data-testid="composition-stage-inner"]').screenshot({ path: `evidence/g3a1/gpu/headed-${letter}.png` });
}
out.visibility = await page.evaluate(() => document.visibilityState);
await mkdir("evidence/g3a1/gpu", { recursive: true });
await writeFile("evidence/g3a1/gpu/headed.json", JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out, null, 2));
await browser.close();
