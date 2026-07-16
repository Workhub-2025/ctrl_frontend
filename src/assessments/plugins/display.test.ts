import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FileQuestion } from "lucide-react";
import { describe, expect, it } from "vitest";
import { CANDIDATE_ASSESSMENT_CATALOG } from "./candidate-catalog";
import { getAssessmentCatalogueIcon, getAssessmentCatalogueTitle } from "./display";

describe("assessment display catalogue", () => {
  it("resolves every released assessment without the fallback icon", () => {
    for (const assessment of CANDIDATE_ASSESSMENT_CATALOG) {
      expect(getAssessmentCatalogueIcon(assessment.slug)).toBe(assessment.icon);
      expect(getAssessmentCatalogueIcon(assessment.slug)).not.toBe(FileQuestion);
      expect(getAssessmentCatalogueTitle(assessment.slug)).toBe(assessment.title);
    }
  });

  it("uses the fallback icon for an unknown assessment", () => {
    expect(getAssessmentCatalogueIcon("unreleased-module")).toBe(FileQuestion);
  });

  it("keeps assessment modules and report surfaces on semantic theme tokens", () => {
    const files = [
      "src/assessments/plugins/report/call-simulation-breakdown.tsx",
      "src/assessments/plugins/report/breakdown-ui.tsx",
      "src/assessment-modules/shared/operational-readiness-page.tsx",
      "src/assessment-modules/shared/tracked-assessment-shell.tsx",
    ];
    for (const file of files) {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/(?:bg|text|border)-(?:white|slate-\d+)/);
      expect(source).not.toContain("dark:");
    }
  });
});
