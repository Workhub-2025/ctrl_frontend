import { describe, expect, it } from "vitest";

import { resolveFirebaseSessionRole } from "./firebase-session-projection";

describe("resolveFirebaseSessionRole", () => {
  it("maps platform roles onto scoped admin portal roles", () => {
    expect(
      resolveFirebaseSessionRole({
        portalRole: "admin",
        platformRoles: ["billing_admin"],
      }),
    ).toBe("admin_billing");
    expect(
      resolveFirebaseSessionRole({
        portalRole: "admin",
        platformRoles: ["support_admin", "operations_admin"],
      }),
    ).toBe("admin_support_ops");
    expect(
      resolveFirebaseSessionRole({
        portalRole: "admin",
        platformRoles: ["super_admin"],
      }),
    ).toBe("admin");
  });

  it("fails closed when admin context has no platformRoles", () => {
    expect(
      resolveFirebaseSessionRole({
        portalRole: "admin",
      }),
    ).toBe("admin_restricted");
    expect(
      resolveFirebaseSessionRole({
        portalRole: "admin",
        platformRoles: [],
      }),
    ).toBe("admin_restricted");
  });

  it("passes through non-admin portal roles", () => {
    expect(
      resolveFirebaseSessionRole({
        portalRole: "candidate",
      }),
    ).toBe("candidate");
  });
});
