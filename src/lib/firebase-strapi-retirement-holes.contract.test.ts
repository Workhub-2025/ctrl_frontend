import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("Strapi-retirement Firebase-path holes", () => {
  it("Gap 1: admin client access-code route uses the Firebase invitation flow, not a 501", () => {
    const source = read("../app/api/admin/access-codes/client/route.ts");
    expect(source).toContain("requireAdminDualAccess");
    expect(source).toContain("isFirebaseAdminAuth");
    // Firebase branch creates a client_owner invitation and returns an accept link.
    expect(source).toContain("/v1/invitations");
    expect(source).toContain("client_owner");
    expect(source).toContain("invitationAcceptUrl");
    // Legacy Strapi branch preserved.
    expect(source).toContain("generateAdminClientAccessCode");
    // No longer gated behind the 501 legacy-only JWT helper.
    expect(source).not.toContain("requireLegacyCmsJwt");
    expect(source).not.toMatch(/status:\s*501/);
  });

  it("Gap 1: admin UI routes the invite affordance through the invitation flow on Firebase", () => {
    const list = read("../app/admin/clients/page.tsx");
    expect(list).toContain("isFirebaseAuthProvider");
    expect(list).toContain("Invite client contact");
  });

  it("Gap 2: client auto-renew route has a Firebase write branch and keeps the legacy branch", () => {
    const source = read("../app/api/client/auto-renew/route.ts");
    expect(source).toContain("isFirebaseAuthProvider");
    expect(source).toContain("requireFirebaseTenancySession");
    expect(source).toContain("createFirebaseBillingApi");
    expect(source).toContain("setAutoRenew");
    // Legacy Strapi branch preserved.
    expect(source).toContain("requireClientSession");
    expect(source).toContain("updateClientAutoRenew");
    // No longer 503 for Firebase sessions.
    expect(source).not.toMatch(/status:\s*503/);
  });

  it("Gap 2: Firebase billing API exposes the auto-renew write against the domain API", () => {
    const source = read("./firebase-billing-api.ts");
    expect(source).toContain("setAutoRenew");
    expect(source).toContain("/v1/billing/auto-renew");
  });

  it("Gap 3: public contract-options route has a Firebase price branch and keeps the CMS branch", () => {
    const source = read("../app/api/public/contract-options/route.ts");
    expect(source).toContain("isFirebaseAuthProvider");
    expect(source).toContain("platformPricingFromFirebasePrices");
    expect(source).toContain("/v1/internal/billing/prices");
    // Legacy Strapi branch preserved.
    expect(source).toContain("getCmsClient");
    expect(source).toContain("/platform-pricing");
  });
});
