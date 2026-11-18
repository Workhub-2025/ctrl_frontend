import { expect, test, type Page } from "@playwright/test";

const PUBLIC_PAGES = [
  "/",
  "/pricing",
  "/privacy-policy",
  "/terms-conditions",
  "/sub-processors",
  "/accessibility-statement",
  "/auth/login",
  "/join",
] as const;

const PROTECTED_PORTALS = [
  "/admin",
  "/client-dashboard",
  "/hiring-manager-dashboard",
  "/candidate-dashboard",
] as const;

const SIGN_IN_PATH = "/auth/login";

/**
 * Set SMOKE_ALLOW_BACKEND_ERRORS=1 when the app runs without a reachable backend
 * (e.g. locally on placeholder config). Only 5xx from /api/public/* (BFF routes
 * that proxy the Cloud Functions backend) are then tolerated. Leave it unset
 * against a real deployment so those failures are caught.
 */
const ALLOW_BACKEND_ERRORS = process.env.SMOKE_ALLOW_BACKEND_ERRORS === "1";
const BACKEND_PROXY_PREFIX = "/api/public/";

/** Collects console errors and uncaught page errors for the lifetime of the page. */
function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const sourceUrl = message.location().url;
    if (
      ALLOW_BACKEND_ERRORS &&
      sourceUrl &&
      new URL(sourceUrl).pathname.startsWith(BACKEND_PROXY_PREFIX)
    ) {
      return;
    }
    errors.push(`console.error: ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  // The browser's "Failed to load resource" console error omits the URL; record it.
  page.on("response", (response) => {
    if (response.status() < 500) return;
    const tolerated =
      ALLOW_BACKEND_ERRORS &&
      new URL(response.url()).pathname.startsWith(BACKEND_PROXY_PREFIX);
    if (!tolerated) {
      errors.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  return errors;
}

test.describe("public pages render", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} renders without console errors`, async ({ page }) => {
      const errors = trackConsoleErrors(page);

      const response = await page.goto(path, { waitUntil: "load" });
      expect(response, `no response for ${path}`).not.toBeNull();
      expect(response!.status(), `HTTP status for ${path}`).toBeLessThan(400);

      await expect(page.locator("body")).toBeVisible();
      await expect(page.locator("main, h1").first()).toBeVisible();
      await page.waitForLoadState("networkidle").catch(() => undefined);

      expect(errors, `console errors on ${path}`).toEqual([]);
    });
  }
});

test.describe("protected portals redirect anonymous visitors to sign-in", () => {
  for (const path of PROTECTED_PORTALS) {
    test(`${path} redirects to ${SIGN_IN_PATH}`, async ({ page }) => {
      const errors = trackConsoleErrors(page);

      await page.goto(path, { waitUntil: "load" });

      const landed = new URL(page.url());
      expect(landed.pathname).toBe(SIGN_IN_PATH);
      const callbackUrl = landed.searchParams.get("callbackUrl") ?? "";
      expect(callbackUrl, "callbackUrl points back at the portal").toContain(path);

      await expect(page.locator("main, h1").first()).toBeVisible();
      await page.waitForLoadState("networkidle").catch(() => undefined);

      expect(errors, `console errors after redirect from ${path}`).toEqual([]);
    });
  }
});
