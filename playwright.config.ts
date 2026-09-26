import { defineConfig, devices } from "@playwright/test";
import { e2eBaseUrl, e2eEnv } from "./tests/e2e/e2e.config.mjs";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  globalTeardown: "./tests/e2e/global-teardown.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: e2eBaseUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command:
      "node tests/e2e/prepare-db.mjs && npm run build && npx tsx backend/server.ts",
    url: `${e2eBaseUrl}/api/config/authDisabled`,
    reuseExistingServer: false,
    timeout: 240_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...(process.env as Record<string, string>),
      ...e2eEnv,
    },
  },
});
