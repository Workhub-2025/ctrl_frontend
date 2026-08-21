import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

function expectSqlOnlyAdminRoute(source: string) {
  expect(source).toContain("requireAdminDualAccess");
  expect(source).not.toContain("isFirebaseAdminAuth");
  expect(source).not.toContain("cmsRequest");
  expect(source).not.toContain("cmsJwt");
  expect(source).not.toMatch(/still requires the legacy Strapi API/);
}

describe("Firebase admin billing BFF", () => {
  it("loads pricing, upgrade requests, and expiring contracts from domainApi only", () => {
    for (const source of [
      route("../app/api/admin/billing/pricing/route.ts"),
      route("../app/api/admin/billing/upgrade-requests/route.ts"),
      route("../app/api/admin/billing/expiring-contracts/route.ts"),
    ]) {
      expectSqlOnlyAdminRoute(source);
    }
    const pricing = route("../app/api/admin/billing/pricing/route.ts");
    expect(pricing).toContain("SQL seeder");
    expect(pricing).not.toContain("savePlatformPricing");
    expect(pricing).toMatch(/status:\s*501/);
  });

  it("sends and resends invoices through admin checkout", () => {
    for (const source of [
      route("../app/api/admin/billing/send-invoice/[billingRequestId]/route.ts"),
      route("../app/api/admin/billing/resend-invoice/[billingRequestId]/route.ts"),
    ]) {
      expect(source).toContain("createFirebaseBillingApi");
      expect(source).not.toContain("isFirebaseAdminAuth");
      expect(source).not.toContain("cmsRequest");
    }
  });

  it("composes activation and renewal through create request + checkout", () => {
    for (const source of [
      route("../app/api/admin/billing/send-activation/[clientId]/route.ts"),
      route("../app/api/admin/billing/send-renewal/[clientId]/route.ts"),
    ]) {
      expectSqlOnlyAdminRoute(source);
      expect(source).toContain("createFirebaseBillingApi");
      expect(source).toContain("createAdminBillingRequest");
      expect(source).toContain("createAdminCheckout");
      expect(source).not.toContain("requireLegacyCmsJwt");
      expect(source).not.toMatch(/status:\s*501/);
    }
  });

  it("processes seat decreases through domainApi", () => {
    const source = route(
      "../app/api/admin/billing/process-seat-decrease/[requestId]/route.ts",
    );
    expectSqlOnlyAdminRoute(source);
    expect(source).toContain("processSeatDecrease");
    expect(source).not.toMatch(/status:\s*501/);
  });
});
