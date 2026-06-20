import { describe, expect, it } from "vitest";
import { isAssessmentEntitledForClient } from "@/lib/client/entitlements";

describe("isAssessmentEntitledForClient", () => {
  it("grants default platform assessments without additional slugs", () => {
    for (const slug of [
      "situational-judgement",
      "typing",
      "prioritisation",
      "call-simulation",
    ]) {
      expect(isAssessmentEntitledForClient({ slug, entitlementTier: "core" }, {})).toBe(true);
      expect(isAssessmentEntitledForClient({ slug }, {})).toBe(true);
    }
  });

  it("grants catalogue core tier regardless of slug list", () => {
    expect(
      isAssessmentEntitledForClient(
        { slug: "short-term-memory", entitlementTier: "core" },
        {},
      ),
    ).toBe(true);
  });

  it("grants premium slug when listed in additionalAssessmentSlugs", () => {
    expect(
      isAssessmentEntitledForClient(
        { slug: "short-term-memory", entitlementTier: "premium" },
        { additionalAssessmentSlugs: ["short-term-memory"] },
      ),
    ).toBe(true);
  });

  it("denies premium slug when not in additionalAssessmentSlugs", () => {
    expect(
      isAssessmentEntitledForClient(
        { slug: "short-term-memory", entitlementTier: "premium" },
        {},
      ),
    ).toBe(false);
    expect(
      isAssessmentEntitledForClient(
        { slug: "short-term-memory", entitlementTier: "premium" },
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
        { slug: "short-term-memory", entitlementTier: "premium" },
        { additionalAssessmentSlugs: [null, "", 42, "short-term-memory"] },
      ),
    ).toBe(true);
  });
});
