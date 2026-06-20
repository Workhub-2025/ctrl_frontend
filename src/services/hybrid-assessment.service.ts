import type { HybridAssessmentSummary } from "@/types/hybrid-assessment.types";

/**
 * @deprecated The `/api/assessment/hybrid-summary` BFF route was never shipped.
 * Keep this module only as a marker for legacy callers until the hybrid flow is
 * redesigned around the current assessment-result / candidate-attempt contract.
 */
export const HybridAssessmentService = {
  async persistSummary(summary: HybridAssessmentSummary) {
    void summary;
    throw new Error(
      "Hybrid summary persistence is deprecated: /api/assessment/hybrid-summary is not available."
    );
  },
};
