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

export function hasCallSimulationReportBreakdown(result: HiringManagerAssessmentResult | null): boolean {
  return Boolean(result?.metrics && result.numericScore !== null);
}
