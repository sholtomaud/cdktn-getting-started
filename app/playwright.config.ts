import { defineConfig, devices } from "@playwright/test";

/**
 * BASE_URL controls where E2E tests run:
 *   - Local (default):  http://localhost:4173  (vite preview)
 *   - Post-deploy:      set BASE_URL=https://xxx.cloudfront.net
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:4173",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  // Start vite preview before tests when running locally (no BASE_URL set)
  ...(process.env.BASE_URL
    ? {}
    : {
        webServer: {
          command: "npm run preview",
          url: "http://localhost:4173",
          reuseExistingServer: !process.env.CI,
        },
      }),
});
