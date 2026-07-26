import { describe, expect, it } from "vitest";
import {
  buildAuthorizedProfileUpdate,
  canAccessEqualityMonitoring,
  emailVerificationLabel,
  formatMemberSince,
} from "@/lib/profile-authority";

describe("profile field authority", () => {
  it("keeps equality monitoring candidate-only", () => {
    expect(canAccessEqualityMonitoring("candidate")).toBe(true);
    expect(canAccessEqualityMonitoring("client")).toBe(false);
    expect(canAccessEqualityMonitoring("admin")).toBe(false);

    const denied = buildAuthorizedProfileUpdate(
      { firstName: "A", organization: "Changed", equalityMonitoring: { completed: true } },
      "client",
    );
    expect(denied).toEqual({
      data: { firstName: "A" },
      forbiddenEqualityMonitoring: true,
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
