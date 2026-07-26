import { describe, expect, it } from "vitest";

import {
  ASSESSMENT_PLATFORM_REGISTRY,
  CORE_PLATFORM_ASSESSMENT_SLUGS,
  PREMIUM_PLATFORM_ASSESSMENT_SLUGS,
  assessmentEntitlementTier,
  preferredAssessmentReleaseVersion,
} from "@/lib/assessment-platform-registry";

describe("assessment platform registry", () => {
  it("lists five product slugs with call-sim preferring 1.1.0", () => {
    expect(ASSESSMENT_PLATFORM_REGISTRY).toHaveLength(5);
    expect(preferredAssessmentReleaseVersion("call-simulation")).toBe("1.1.0");
    expect(preferredAssessmentReleaseVersion("typing")).toBe("1.0.1");
  });

  it("treats the current catalogue as core (premium empty until #6+)", () => {
    expect(CORE_PLATFORM_ASSESSMENT_SLUGS).toContain("short-term-memory");
    expect(PREMIUM_PLATFORM_ASSESSMENT_SLUGS).toEqual([]);
    expect(assessmentEntitlementTier("short-term-memory")).toBe("core");
    expect(assessmentEntitlementTier("unknown-premium")).toBe("premium");
  });
});
