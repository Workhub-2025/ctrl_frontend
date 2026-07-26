import { describe, expect, it } from "vitest";
import { accountTotpUpstreamPath } from "@/lib/auth/totp-route-contract";

describe("shared account TOTP route contract", () => {
  it("maps admin accounts internally without exposing a second browser API", () => {
    expect(accountTotpUpstreamPath("/auth/totp/status", false)).toBe(
      "/auth/totp/status",
    );
    expect(accountTotpUpstreamPath("/auth/totp/status", true)).toBe(
      "/auth/admin/totp/status",
    );
  });

  it("rejects paths outside the shared account contract", () => {
    expect(() =>
      accountTotpUpstreamPath("/users/me", true),
    ).toThrow("outside the shared contract");
  });
});
