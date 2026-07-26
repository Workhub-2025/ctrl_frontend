import { describe, expect, it } from "vitest";
import { isAssessmentEntitledForClient } from "@/lib/client/entitlements";

describe("isAssessmentEntitledForClient", () => {
  it("grants default platform assessments without additional slugs", () => {
    for (const slug of [
      "situational-judgement",
      "typing",
      "prioritisation",
      "call-simulation",
      "short-term-memory",
    ]) {
      expect(isAssessmentEntitledForClient({ slug, entitlementTier: "core" }, {})).toBe(true);
      expect(isAssessmentEntitledForClient({ slug }, {})).toBe(true);
    }
  });

  it("grants catalogue core tier regardless of slug list", () => {
    expect(
      isAssessmentEntitledForClient(
        { slug: "future-premium-module", entitlementTier: "core" },
        {},
      ),
    ).toBe(true);
  });

  it("grants premium slug when listed in additionalAssessmentSlugs", () => {
    expect(
      isAssessmentEntitledForClient(
        { slug: "future-premium-module", entitlementTier: "premium" },
        { additionalAssessmentSlugs: ["future-premium-module"] },
      ),
    ).toBe(true);
  });

  it("denies premium slug when not in additionalAssessmentSlugs", () => {
    expect(
      isAssessmentEntitledForClient(
        { slug: "future-premium-module", entitlementTier: "premium" },
        {},
      ),
    ).toBe(false);
    expect(
      isAssessmentEntitledForClient(
        { slug: "future-premium-module", entitlementTier: "premium" },
        { additionalAssessmentSlugs: ["other-assessment"] },
      ),
    ).toBe(false);
  });

  it("fail-closed when slug is missing", () => {
    expect(isAssessmentEntitledForClient({ entitlementTier: "core" }, {})).toBe(false);
    expect(isAssessmentEntitledForClient({}, {})).toBe(false);
  });

  it("ignores malformed additionalAssessmentSlugs entries", () => {
    expect(
      isAssessmentEntitledForClient(
        { slug: "future-premium-module", entitlementTier: "premium" },
        { additionalAssessmentSlugs: [null, "", 42, "future-premium-module"] },
      ),
    ).toBe(true);
  });
});
