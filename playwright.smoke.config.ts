import { defineConfig, devices } from "@playwright/test";

/**
 * Anonymous smoke suite: public pages render, portals bounce to sign-in,
 * no console errors. Needs no credentials.
 *
 * - Default: starts `npm run dev` on port 3000 and tests it.
 * - PLAYWRIGHT_BASE_URL=https://staging.example.com npm run test:smoke
 *   tests an already-running deployment instead (no local server started).
 */
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseUrl ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e/smoke",
  // *.spec.ts is gitignored repo-wide, so the committed suite uses *.smoke.ts.
  testMatch: "**/*.smoke.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"], ["html", { open: "never" }]],
  // First hit of each route compiles it in `next dev`, which can be slow.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
