import { describe, expect, it } from "vitest";
import { guardPortalApiRoute } from "@/lib/auth/bff-api-middleware";

describe("guardPortalApiRoute", () => {
  it("allows matching portal roles", () => {
    expect(guardPortalApiRoute("/api/client/overview", true, "client")).toBeNull();
    expect(guardPortalApiRoute("/api/hiring-manager/overview", true, "hiring_manager")).toBeNull();
    expect(guardPortalApiRoute("/api/admin/overview", true, "admin")).toBeNull();
    expect(guardPortalApiRoute("/api/candidate/applications", true, "candidate")).toBeNull();
  });

  it("blocks cross-portal access", () => {
    const response = guardPortalApiRoute("/api/client/overview", true, "hiring_manager");
    expect(response?.status).toBe(403);
  });

  it("requires authentication for protected prefixes", () => {
    const response = guardPortalApiRoute("/api/client/overview", false, null);
    expect(response?.status).toBe(401);
  });

  it("ignores unrelated routes", () => {
    expect(guardPortalApiRoute("/api/auth/login", false, null)).toBeNull();
  });
});
