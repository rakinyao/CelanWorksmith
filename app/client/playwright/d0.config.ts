import { defineConfig } from "@playwright/test";

const requestedProject = process.env.PLAYWRIGHT_PROJECT || "d0";

if (requestedProject !== "d0" && requestedProject !== "t9") {
  throw new Error(
    `Unsupported PLAYWRIGHT_PROJECT: ${requestedProject}. Use d0 or t9.`,
  );
}

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  outputDir: "./results/d0",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  projects:
    requestedProject === "t9"
      ? [{ name: "t9", testDir: "./tests/t9" }]
      : [{ name: "d0", testDir: "./tests/d0" }],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1",
    ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? {
          launchOptions: {
            executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH,
          },
        }
      : {}),
    headless: true,
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
});
