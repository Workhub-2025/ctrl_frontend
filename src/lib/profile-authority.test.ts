import { describe, expect, it } from "vitest";
import {
  buildAuthorizedProfileUpdate,
  canAccessEqualityMonitoring,
  emailVerificationLabel,
  formatMemberSince,
} from "@/lib/profile-authority";

describe("profile field authority", () => {
  it("allows optional equality monitoring for candidate, client, and hiring-manager accounts", () => {
    expect(canAccessEqualityMonitoring("candidate")).toBe(true);
    expect(canAccessEqualityMonitoring("client")).toBe(true);
    expect(canAccessEqualityMonitoring("hiring_manager")).toBe(true);
    expect(canAccessEqualityMonitoring("admin")).toBe(false);

    const allowed = buildAuthorizedProfileUpdate(
      { firstName: "A", organization: "Changed", equalityMonitoring: { completed: true } },
      "client",
    );
    expect(allowed).toEqual({
      data: { firstName: "A", equalityMonitoring: { completed: true } },
      forbiddenEqualityMonitoring: false,
    });
  });

  it("never accepts organization from self-service profile updates", () => {
    expect(
      buildAuthorizedProfileUpdate(
        { organization: "Changed", phone: "+441234" },
        "candidate",
      ),
    ).toEqual({
      data: { phone: "+441234" },
      forbiddenEqualityMonitoring: false,
    });
  });

  it("formats authoritative account facts without inventing values", () => {
    expect(formatMemberSince("2024-01-05T10:00:00.000Z")).toBe("5 Jan 2024");
    expect(formatMemberSince(undefined)).toBe("Not available");
    expect(emailVerificationLabel(true)).toBe("Verified");
    expect(emailVerificationLabel(false)).toBe("Not verified");
    expect(emailVerificationLabel(undefined)).toBe("Not available");
  });
});
