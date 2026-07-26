import { describe, expect, it } from "vitest";
import {
  isElevatedAdminPortalRole,
  normalizeRole,
  resolveAppRole,
  roleSupportsTotp,
  routeForRole,
} from "@/lib/auth/role-model";

describe("role-model", () => {
  it("resolves known aliases", () => {
    expect(resolveAppRole("hiring-manager")).toBe("hiring_manager");
    expect(resolveAppRole({ type: "client" })).toBe("client");
  });

  it("returns null for unknown roles", () => {
    expect(resolveAppRole("totally-unknown")).toBeNull();
  });

  it("keeps candidate fallback for legacy normalizeRole callers", () => {
    expect(normalizeRole("totally-unknown")).toBe("candidate");
  });

  it("supports MFA for staff portals but not candidate accounts", () => {
    expect(roleSupportsTotp("admin")).toBe(true);
    expect(roleSupportsTotp("admin_support")).toBe(true);
    expect(roleSupportsTotp("admin_restricted")).toBe(true);
    expect(roleSupportsTotp("client")).toBe(true);
    expect(roleSupportsTotp("hiring-manager")).toBe(true);
    expect(roleSupportsTotp("candidate")).toBe(false);
    expect(roleSupportsTotp("totally-unknown")).toBe(false);
  });

  it("fails closed for restricted admin recovery", () => {
    expect(isElevatedAdminPortalRole("admin_restricted")).toBe(false);
    expect(isElevatedAdminPortalRole("admin")).toBe(true);
    expect(routeForRole("admin_restricted")).toBe("/profile");
    expect(routeForRole("admin")).toBe("/admin");
  });
});
