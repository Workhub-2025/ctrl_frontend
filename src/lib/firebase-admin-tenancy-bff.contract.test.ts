import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const route = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");

describe("Firebase admin tenancy BFF", () => {
  it("dual-paths clients list and create through Firebase organizations", () => {
    for (const source of [
      route("../app/api/admin/clients/route.ts"),
      route("../app/api/admin/clients/create/route.ts"),
    ]) {
      expect(source).toContain("requireAdminDualAccess");
      expect(source).toContain("isFirebaseAdminAuth");
      expect(source).toContain("/v1/organizations");
      expect(source).not.toMatch(/still requires the legacy Strapi API/);
    }
  });

  it("uses Firebase directory and platform-administrator APIs for users/team", () => {
    expect(route("../app/api/admin/users/route.ts")).toContain(
      "/v1/directory/users",
    );
    expect(route("../app/api/admin/team/members/route.ts")).toContain(
      "/v1/platform-administrators",
    );
    expect(route("../app/api/admin/team/roles/route.ts")).toContain(
      "ADMIN_ASSIGNABLE_GROUP_LABELS",
    );
  });

  it("maps assessment releases for versions and platform sync", () => {
    expect(route("../app/api/admin/assessment-versions/route.ts")).toContain(
      "/v1/assessment-releases",
    );
    expect(
      route("../app/api/admin/assessment/platform-sync/route.ts"),
    ).toContain("/v1/assessment-releases");
  });

  it("builds Firebase analytics in the admin page shape", () => {
    const source = route("../app/api/admin/analytics/route.ts");
    expect(source).toContain("requireAdminDualAccess");
    expect(source).toContain("buildFirebaseAdminRevenueAnalytics");
    expect(source).toContain("isFirebaseAdminAuth");
    expect(source).not.toContain("FIREBASE_PENDING_ANALYTICS");
  });

  it("dual-paths seat slots, export, and downgrade helpers", () => {
    for (const source of [
      route("../app/api/admin/clients/[clientId]/seat-slots/route.ts"),
      route("../app/api/admin/clients/[clientId]/export-seats/route.ts"),
      route("../app/api/admin/clients/[clientId]/downgrade-seats/route.ts"),
      route("../app/api/admin/clients/[clientId]/downgrade-seat/route.ts"),
    ]) {
      expect(source).toContain("requireAdminDualAccess");
      expect(source).toContain("isFirebaseAdminAuth");
      expect(source).not.toContain("requireLegacyCmsJwt");
      expect(source).not.toMatch(/status:\s*501/);
    }
  });
});
