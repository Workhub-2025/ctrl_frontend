import { describe, expect, it } from "vitest";
import { isAllowedProxyPath } from "./proxy-path";

describe("Strapi proxy path allowlist", () => {
  it("allows the explicit resource prefixes and safe identifiers", () => {
    expect(isAllowedProxyPath(["support-tickets", "ticket_123"])).toBe(true);
    expect(isAllowedProxyPath(["users-permissions", "roles"])).toBe(true);
  });

  it("rejects traversal, encoded separators, and unrelated routes", () => {
    expect(isAllowedProxyPath(["users-permissions", "..", "admin"])).toBe(false);
    expect(isAllowedProxyPath(["users-permissions", "%2e%2e", "admin"])).toBe(false);
    expect(isAllowedProxyPath(["users-permissions", "roles/admin"])).toBe(false);
    expect(isAllowedProxyPath(["admin", "users"])).toBe(false);
  });
});
