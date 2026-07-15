import { describe, expect, it } from "vitest";
import {
  UK_LEGAL,
  UK_SUB_PROCESSOR_CATEGORIES,
  getUkComplianceConfigurationIssues,
} from "@/lib/legal/uk-compliance";

describe("UK compliance configuration", () => {
  it("uses explicit, versioned legal notices", () => {
    expect(UK_LEGAL.privacyPolicyVersion).toBe("2.1");
    expect(UK_LEGAL.termsVersion).toBe("2.1");
    expect(UK_LEGAL.equalityMonitoringNoticeVersion).toBe("1.1");
  });

  it("includes AI-assisted scoring in the processor inventory", () => {
    expect(
      UK_SUB_PROCESSOR_CATEGORIES.some((processor) =>
        processor.category.includes("AI-assisted"),
      ),
    ).toBe(true);
  });

  it("reports unresolved production facts instead of treating placeholders as complete", () => {
    const issues = getUkComplianceConfigurationIssues();
    expect(issues).toContain("NEXT_PUBLIC_CTRL_COMPANY_NUMBER is required");
    expect(issues).toContain("NEXT_PUBLIC_CTRL_REGISTERED_OFFICE is required");
    expect(issues).toContain("NEXT_PUBLIC_CTRL_ICO_NUMBER is required");
  });
});
