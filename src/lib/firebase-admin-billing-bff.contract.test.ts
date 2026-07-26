import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("Firebase admin billing BFF", () => {
  it("dual-paths pricing, upgrade requests, and expiring contracts", () => {
    for (const source of [
      route("../app/api/admin/billing/pricing/route.ts"),
      route("../app/api/admin/billing/upgrade-requests/route.ts"),
      route("../app/api/admin/billing/expiring-contracts/route.ts"),
    ]) {
      expect(source).toContain("requireAdminDualAccess");
      expect(source).toContain("isFirebaseAdminAuth");
      expect(source).not.toMatch(/still requires the legacy Strapi API/);
    }
  });

  it("sends and resends invoices through Firebase admin checkout", () => {
    for (const source of [
      route("../app/api/admin/billing/send-invoice/[billingRequestId]/route.ts"),
      route("../app/api/admin/billing/resend-invoice/[billingRequestId]/route.ts"),
    ]) {
      expect(source).toContain("createFirebaseBillingApi");
      expect(source).toContain("isFirebaseAdminAuth");
    }
  });

  it("composes activation and renewal through Firebase create request + checkout", () => {
    for (const source of [
      route("../app/api/admin/billing/send-activation/[clientId]/route.ts"),
      route("../app/api/admin/billing/send-renewal/[clientId]/route.ts"),
    ]) {
      expect(source).toContain("requireAdminDualAccess");
      expect(source).toContain("isFirebaseAdminAuth");
      expect(source).toContain("createFirebaseBillingApi");
      expect(source).toContain("createAdminBillingRequest");
      expect(source).toContain("createAdminCheckout");
      expect(source).not.toContain("requireLegacyCmsJwt");
      expect(source).not.toMatch(/status:\s*501/);
    }
  });

  it("processes seat decreases through Firebase domainApi", () => {
    const source = route(
      "../app/api/admin/billing/process-seat-decrease/[requestId]/route.ts",
    );
    expect(source).toContain("requireAdminDualAccess");
    expect(source).toContain("isFirebaseAdminAuth");
    expect(source).toContain("processSeatDecrease");
    expect(source).not.toMatch(/status:\s*501/);
  });
});
