import type { HiringManagerAssessmentResult } from "@/services/hiring-manager-portal-client.service";

/**
 * Whether a scored result carries enough evidence for its breakdown to be worth
 * opening. Each assessment answers for itself: a typing result without run
 * evidence still has speed and accuracy worth showing, while a memory result
 * without recall data has nothing to say.
 */

function hasScoredMetrics(result: HiringManagerAssessmentResult | null): boolean {
  return Boolean(result?.metrics && result.numericScore !== null);
}

export function hasTypingReportBreakdown(
  result: HiringManagerAssessmentResult | null,
): boolean {
  if (!result?.metrics) return false;
  return (
    hasScoredMetrics(result) ||
    result.wpm !== null ||
    Array.isArray(result.metrics.passageEvidence)
  );
}

export function hasPrioritisationReportBreakdown(
  result: HiringManagerAssessmentResult | null,
): boolean {
  return hasScoredMetrics(result);
}

export function hasSituationalJudgementReportBreakdown(
  result: HiringManagerAssessmentResult | null,
): boolean {
  return hasScoredMetrics(result);
}

export function hasShortTermMemoryReportBreakdown(
  result: HiringManagerAssessmentResult | null,
): boolean {
  if (!result?.metrics) return false;
  return (
    hasScoredMetrics(result) || result.metrics.factRecallAccuracy !== undefined
  );
}

export function hasCallSimulationReportBreakdown(
  result: HiringManagerAssessmentResult | null,
): boolean {
  return hasScoredMetrics(result);
}
