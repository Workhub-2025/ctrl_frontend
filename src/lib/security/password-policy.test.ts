import { describe, expect, it } from "vitest";
import { getPasswordPolicyIssue } from "./password-policy";

describe("password policy", () => {
  it("accepts a long passphrase", () => {
    expect(getPasswordPolicyIssue("blue orchard signal lantern")).toBeNull();
  });

  it("rejects weak and account-derived passwords", () => {
    expect(getPasswordPolicyIssue("admin123")).not.toBeNull();
    expect(getPasswordPolicyIssue("a".repeat(12))).not.toBeNull();
    expect(getPasswordPolicyIssue("mihir-safe-password", "mihir@example.com")).not.toBeNull();
  });
});
