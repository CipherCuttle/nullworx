import { defineConfig } from "@playwright/test";

const port = 3300;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["json", { outputFile: "evidence/tests/playwright-results.json" }]],
  use: {
    baseURL,
    channel: "chrome",
    headless: true,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    launchOptions: {
      args: [
        "--enable-unsafe-swiftshader",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--disable-dev-shm-usage",
      ],
    },
  },
  webServer: {
    command: `pnpm start --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      NODE_ENV: "production",
      NEWSLETTER_PROVIDER: "mock",
      NEWSLETTER_ALLOW_MOCK: "1",
      NEWSLETTER_MOCK_SECRET: "local-e2e-only-mock-secret-not-a-real-credential",
    },
  },
  outputDir: "test-results",
});
