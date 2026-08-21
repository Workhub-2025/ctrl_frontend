import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("Strapi-retirement Firebase-path holes", () => {
  it("Gap 1: admin client access-code route uses the invitation flow only", () => {
    const source = read("../app/api/admin/access-codes/client/route.ts");
    expect(source).toContain("requireAdminDualAccess");
    expect(source).toContain("/v1/invitations");
    expect(source).toContain("client_owner");
    expect(source).toContain("invitationAcceptUrl");
    expect(source).not.toContain("isFirebaseAdminAuth");
    expect(source).not.toContain("generateAdminClientAccessCode");
    expect(source).not.toContain("requireLegacyCmsJwt");
    expect(source).not.toMatch(/status:\s*501/);
  });

  it("Gap 1: admin UI routes the invite affordance through the invitation flow on Firebase", () => {
    const list = read("../app/admin/clients/page.tsx");
    expect(list).toContain("isFirebaseAuthProvider");
    expect(list).toContain("Invite client contact");
  });

  it("Gap 2: client auto-renew route writes through domainApi only", () => {
    const source = read("../app/api/client/auto-renew/route.ts");
    expect(source).toContain("requireFirebaseTenancySession");
    expect(source).toContain("createFirebaseBillingApi");
    expect(source).toContain("setAutoRenew");
    expect(source).not.toContain("isFirebaseAuthProvider");
    expect(source).not.toContain("requireClientSession");
    expect(source).not.toContain("updateClientAutoRenew");
    expect(source).not.toMatch(/status:\s*503/);
  });

  it("Gap 2: Firebase billing API exposes the auto-renew write against the domain API", () => {
    const source = read("./firebase-billing-api.ts");
    expect(source).toContain("setAutoRenew");
    expect(source).toContain("/v1/billing/auto-renew");
    expect(source).toContain("requireFirebaseBillingSession");
    expect(source).not.toContain("tryRequireFirebaseBillingSession");
  });

  it("Gap 2: client billing/contract/upgrade routes fail closed on Firebase session", () => {
    for (const source of [
      read("../app/api/client/billing/checkout/route.ts"),
      read("../app/api/client/billing/confirm/route.ts"),
      read("../app/api/client/billing/portal/route.ts"),
      read("../app/api/client/billing/pricing/route.ts"),
      read("../app/api/client/upgrade-requests/route.ts"),
    ]) {
      expect(source).toContain("requireFirebaseBillingSession");
      expect(source).not.toContain("cmsRequest");
      expect(source).not.toContain("getServerCmsJwt");
      expect(source).not.toContain("tryRequireFirebaseBillingSession");
    }
    const contract = read("../app/api/client/contract/route.ts");
    expect(contract).toContain("requireFirebaseTenancySession");
    expect(contract).not.toContain("requireClientSession");
    expect(contract).not.toContain("getClientContract");
  });

  it("Gap 3: public contract-options route loads prices from domainApi only", () => {
    const source = read("../app/api/public/contract-options/route.ts");
    expect(source).toContain("platformPricingFromFirebasePrices");
    expect(source).toContain("/v1/internal/billing/prices");
    expect(source).not.toContain("isFirebaseAuthProvider");
    expect(source).not.toContain("getCmsClient");
    expect(source).not.toContain("/platform-pricing");
  });
});
