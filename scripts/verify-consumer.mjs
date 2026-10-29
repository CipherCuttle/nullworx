#!/usr/bin/env node
/** Runs the preserved clean-consumer browser callback against http://127.0.0.1:3101. */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright-core";
import verifyConsumer from "./browser-consumer.mjs";

const ORIGIN = process.env.CONSUMER_ORIGIN ?? "http://127.0.0.1:3101";
const EVIDENCE = path.resolve(process.env.EVIDENCE_DIR ?? "evidence/g1");
const CHROME = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";

const probe = await fetch(ORIGIN);
if (!probe.ok) throw new Error(`Consumer origin is not serving: ${ORIGIN} (${probe.status})`);

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"],
});

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await mkdir(path.join(EVIDENCE, "screenshots"), { recursive: true });
  const screenshot = page.screenshot.bind(page);
  page.screenshot = async (options = {}) => {
    if (typeof options.path === "string") {
      options = { ...options, path: path.join(EVIDENCE, "screenshots", path.basename(options.path)) };
    }
    return screenshot(options);
  };
  const result = await verifyConsumer(page);
  const summary = {
    generatedAt: new Date().toISOString(),
    origin: ORIGIN,
    checks: result.checks,
    failures: result.failures,
    passed: result.checks.length,
    failed: result.failures.length,
    runtimeErrors: result.runtimeErrors,
    failedRequests: result.failedRequests,
  };
  await writeFile(path.join(EVIDENCE, "consumer-results.json"), JSON.stringify(summary, null, 2) + "\n");
  console.log(`${summary.passed}/${summary.passed + summary.failed} clean-consumer browser assertions passed.`);
  if (summary.failed > 0 || result.runtimeErrors.length > 0 || result.failedRequests.length > 0) {
    console.error("Consumer failures:", result.failures);
    console.error("Runtime errors:", result.runtimeErrors);
    console.error("Failed requests:", result.failedRequests);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
