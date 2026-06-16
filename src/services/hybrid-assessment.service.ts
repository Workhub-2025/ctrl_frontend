import type { HybridAssessmentSummary } from "@/types/hybrid-assessment.types";

export const HybridAssessmentService = {
  async persistSummary(summary: HybridAssessmentSummary) {
    const response = await fetch("/api/assessment/hybrid-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(summary),
    });

    if (!response.ok) {
      const fallbackError = "Failed to persist hybrid summary";
      try {
        const payload = await response.json();
        throw new Error(payload?.error || fallbackError);
      } catch {
        throw new Error(fallbackError);
      }
    }

    return response.json();
  },
};
