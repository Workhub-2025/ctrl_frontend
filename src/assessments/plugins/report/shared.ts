import type { HiringManagerAssessmentResult } from "@/services/hiring-manager-portal-client.service";

export type TypingRunMetric = {
  runIndex?: number;
  wpm?: number;
  accuracy?: number;
  mistakeCharacters?: number;
  correctCharacters?: number;
  typedCharacters?: number;
  duration?: number;
};

export function getTypingRuns(metrics?: Record<string, unknown> | null): TypingRunMetric[] {
  const runs = metrics?.assessmentRuns;
  return Array.isArray(runs) ? (runs as TypingRunMetric[]) : [];
}

/** Scored typing runs only — excludes practice (runIndex 0). */
export function getScoredTypingRuns(metrics?: Record<string, unknown> | null): TypingRunMetric[] {
  return getTypingRuns(metrics).filter((run) => (run.runIndex ?? 1) > 0);
}

export function getAverageTypingMistakes(
  metrics?: Record<string, unknown> | null,
  fallback?: number | null,
): number | null {
  const scoredRuns = getScoredTypingRuns(metrics);
  if (scoredRuns.length === 0) {
    return fallback ?? null;
  }

  const totalMistakes = scoredRuns.reduce((sum, run) => sum + (run.mistakeCharacters ?? 0), 0);
  return Math.round(totalMistakes / scoredRuns.length);
}

export function hasTypingReportBreakdown(result: HiringManagerAssessmentResult | null): boolean {
  if (!result) return false;
  return (
    getTypingRuns(result.metrics).length > 0 ||
    result.wpm !== null ||
    result.wpm !== undefined
  );
}

export function hasPrioritisationReportBreakdown(result: HiringManagerAssessmentResult | null): boolean {
  return Boolean(result?.metrics && result.numericScore !== null);
}

export function hasSituationalJudgementReportBreakdown(result: HiringManagerAssessmentResult | null): boolean {
  return Boolean(result?.metrics && result.numericScore !== null);
}

export function hasShortTermMemoryReportBreakdown(result: HiringManagerAssessmentResult | null): boolean {
  return Boolean(result?.metrics && (result.metrics as Record<string, unknown>).factRecallAccuracy !== undefined);
}

export function hasCallSimulationReportBreakdown(result: HiringManagerAssessmentResult | null): boolean {
  return Boolean(result?.metrics && result.numericScore !== null);
}
