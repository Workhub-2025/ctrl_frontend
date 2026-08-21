import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), "utf8");

describe("account and profile consolidation", () => {
  it("uses one live account-security surface and browser API", () => {
    const profile = read("src/app/profile/page.tsx");
    const adminSettings = read("src/app/admin/settings/page.tsx");
    const adminPanel = read(
      "src/components/admin/admin-totp-security-panel.tsx",
    );

    expect(profile).toContain("AccountSecurityPanel");
    expect(adminSettings).toContain('/profile?tab=security');
    expect(adminPanel).toContain("AccountSecurityPanel");
    expect(adminPanel).not.toContain("fetch(");
    expect(adminPanel).not.toContain("/api/admin/totp/");

    for (const action of [
      "status",
      "begin-setup",
      "complete-setup",
      "disable",
    ]) {
      expect(read(`src/app/api/admin/totp/${action}/route.ts`)).toContain(
        `@/app/api/account/totp/${action}/route`,
      );
    }
  });

  it("keeps organization read-only and identity facts authoritative", () => {
    const profile = read("src/app/profile/page.tsx");
    const profileApi = read("src/app/api/user/profile/route.ts");

    expect(profile).toContain("organization-authority");
    expect(profile).not.toContain('handleInputChange("organization"');
    expect(profile).not.toContain("new Date().toLocaleDateString()");
    expect(profile).not.toMatch(/Email verified:[\s\S]{0,180}>Verified</);
    expect(profileApi).toMatch(
      /userData\.client\?\.name|getFirebaseUserProfile/,
    );
    expect(profileApi).toMatch(/userData\.createdAt|createdAt:/);
    expect(profileApi).toMatch(/userData\.confirmed|emailVerified/);
  });

  it("keeps equality monitoring behind the shared role authority check", () => {
    const profile = read("src/app/profile/page.tsx");
    const equalityLayout = read(
      "src/app/auth/equality-monitoring/layout.tsx",
    );
    const profileApi = read("src/app/api/user/profile/route.ts");

    expect(profile).toContain("canUseEqualityMonitoring");
    expect(equalityLayout).toContain("canAccessEqualityMonitoring");
    expect(profileApi).toContain("forbiddenEqualityMonitoring");
    expect(read("src/lib/firebase-profile-api.ts")).toContain(
      "/v1/privacy/me/equality-monitoring",
    );
  });

  it("removes overview shortcut and metric duplication", () => {
    const adminOverview = read("src/app/admin/page.tsx");
    expect(adminOverview).not.toContain("AdminQuickLinkRow");
    expect(adminOverview).not.toContain("AdminStatTile");
  });
});
