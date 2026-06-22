import type { HiringManagerAssessmentResult } from "@/services/hiring-manager-portal-client.service";
import { findAssessmentResultForStackEntry } from "@/lib/hiring-manager/assessment-matching";

type StackAssessment = {
  displayName: string;
  slug?: string;
  weight: number;
};

type ScoreResult = Pick<HiringManagerAssessmentResult, "assessment" | "numericScore" | "assessmentStatus">;

/**
 * Weighted composite score aligned with the HM candidates list:
 * sum(score * weight / 100) for completed assessments — no renormalization.
 */
export function computeWeightedCompositeScore(
  stack: StackAssessment[],
  results: ScoreResult[]
): number | null {
  if (stack.length === 0) return null;

  let composite = 0;
  let hasScore = false;

  for (const entry of stack) {
    const weight = Number(entry.weight) || 0;
    if (weight <= 0) continue;

    const result = findAssessmentResultForStackEntry(entry, results, { skipAbandoned: true });

    if (result?.numericScore !== null && result?.numericScore !== undefined) {
      composite += (result.numericScore * weight) / 100;
      hasScore = true;
    }
  }

  return hasScore ? Math.round(composite) : null;
}
