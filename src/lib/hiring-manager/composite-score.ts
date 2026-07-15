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

/**
 * Return a composite only when every assessment in the configured stack has a
 * non-abandoned numeric result. Partial composites are useful for internal
 * progress calculations, but must not be presented as decision-ready scores.
 */
export function computeDecisionReadyCompositeScore(
  stack: StackAssessment[],
  results: ScoreResult[]
): number | null {
  if (stack.length === 0) return null;

  const allAssessmentsScored = stack.every((entry) => {
    const result = findAssessmentResultForStackEntry(entry, results);
    return (
      result?.assessmentStatus !== "abandoned" &&
      typeof result?.numericScore === "number" &&
      Number.isFinite(result.numericScore)
    );
  });

  return allAssessmentsScored
    ? computeWeightedCompositeScore(stack, results)
    : null;
}
