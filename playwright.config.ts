import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const requiredCiEnvironment = [
  "E2E_BASE_URL",
  "E2E_ADMIN_EMAIL",
  "E2E_ADMIN_PASSWORD",
  "E2E_CLIENT_EMAIL",
  "E2E_CLIENT_PASSWORD",
  "E2E_HM_EMAIL",
  "E2E_HM_PASSWORD",
  "E2E_CANDIDATE_EMAIL",
  "E2E_CANDIDATE_PASSWORD",
  "E2E_SHARED_CANDIDATE_ID",
  "E2E_CLIENT_DOCUMENT_ID",
  "E2E_ASSESSMENT_SESSION_ID",
  "E2E_CANDIDATE_SESSION_ID",
] as const;

if (process.env.CI) {
  const missing = requiredCiEnvironment.filter(
    (name) => !process.env[name]?.trim(),
  );
  if (missing.length > 0) {
    throw new Error(
      `E2E CI configuration is incomplete. Missing: ${missing.join(", ")}`,
    );
  }
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html"], ["list"], ["./e2e/truthful-run-reporter.ts"]]
    : [["list"], ["./e2e/truthful-run-reporter.ts"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
