// Probe which WebGL backend system Chrome selects under several launch modes.
import { chromium } from "playwright-core";

const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";

const CONFIGS = [
  { name: "headless-default", headless: true, args: [] },
  { name: "headless-angle-gl", headless: true, args: ["--use-gl=angle", "--use-angle=gl"] },
  { name: "headless-angle-vulkan", headless: true, args: ["--use-gl=angle", "--use-angle=vulkan"] },
  { name: "headless-enable-gpu", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist"] },
  { name: "headed-default", headless: false, args: [] },
  { name: "headed-angle-gl", headless: false, args: ["--use-gl=angle", "--use-angle=gl", "--ignore-gpu-blocklist"] },
];

const PROBE = () => {
  const out = { webgl2: false, renderer: null, vendor: null, unmasked: null, unmaskedVendor: null, version: null, error: null };
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2");
    out.webgl2 = Boolean(gl);
    if (gl) {
      out.renderer = gl.getParameter(gl.RENDERER);
      out.vendor = gl.getParameter(gl.VENDOR);
      out.version = gl.getParameter(gl.VERSION);
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        out.unmasked = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
        out.unmaskedVendor = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch (error) {
    out.error = String(error);
  }
  return out;
};

for (const config of CONFIGS) {
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: CHROME,
      headless: config.headless,
      args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", ...config.args],
      timeout: 30000,
    });
    const page = await browser.newPage();
    await page.goto("data:text/html,<canvas></canvas>");
    const info = await page.evaluate(PROBE);
    const gpu = await page.evaluate(async () => {
      // GPU info is not exposed without chrome://gpu; the renderer string is the
      // only app-visible truth, so report it verbatim.
      return document.createElement("canvas").getContext("webgl2") ? "ok" : "none";
    });
    console.log(JSON.stringify({ config: config.name, ...info, gpu }));
  } catch (error) {
    console.log(JSON.stringify({ config: config.name, error: String(error).slice(0, 300) }));
  } finally {
    await browser?.close().catch(() => {});
  }
}
