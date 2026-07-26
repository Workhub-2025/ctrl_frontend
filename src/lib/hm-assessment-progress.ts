import type { HiringManagerAssessmentResult } from "@/types/hiring-manager.types";

export type FirebaseAssignmentAssessmentReport = Readonly<{
  attemptId: string;
  campaignAssessmentId: string;
  assessmentSlug: string;
  releaseVersion: string;
  status:
    | "in_progress"
    | "submitted"
    | "scoring"
    | "scored"
    | "abandoned"
    | "failed";
  resultId: string | null;
  revision: number | null;
  overallScore: number | null;
  meetsConfiguredStandard: boolean | null;
  criticalFlagCount: number | null;
  submittedAt: string | null;
  completedAt: string | null;
  competencyScores?: ReadonlyArray<{
    id: string;
    label: string;
    weight: number;
    score: number;
  }>;
  criticalFlags?: ReadonlyArray<{
    id: string;
    scenarioId: string;
    label: string;
  }>;
  scenarioEvidence?: readonly unknown[];
  reportMetrics?: Readonly<Record<string, unknown>>;
}>;

export function mapFirebaseReportToHmResult(
  result: FirebaseAssignmentAssessmentReport,
): HiringManagerAssessmentResult {
  const isScored = result.status === "scored";
  const isSubmitted =
    result.status === "submitted" || result.status === "scoring";
  const isAbandoned =
    result.status === "abandoned" || result.status === "failed";

  const reportMetrics = result.reportMetrics ?? {};
    const metrics: Record<string, unknown> = {
    attemptId: result.attemptId,
    campaignAssessmentId: result.campaignAssessmentId,
    releaseVersion: result.releaseVersion,
    revision: result.revision,
    criticalFlagCount: result.criticalFlagCount,
    attemptStatus: result.status,
    overallScore: result.overallScore,
    meetsConfiguredStandard: result.meetsConfiguredStandard,
    competencyScores: result.competencyScores ?? reportMetrics.competencyScores,
    criticalFlags: result.criticalFlags ?? reportMetrics.criticalFlags,
    scenarioEvidence: result.scenarioEvidence ?? reportMetrics.scenarioEvidence,
    evidenceLabel: reportMetrics.evidenceLabel,
    wpm: reportMetrics.wpm,
    accuracy: reportMetrics.accuracy,
    passageEvidence: reportMetrics.passageEvidence,
    highPriorityAccuracy: reportMetrics.highPriorityAccuracy,
    mediumPriorityAccuracy: reportMetrics.mediumPriorityAccuracy,
    lowPriorityAccuracy: reportMetrics.lowPriorityAccuracy,
    bandAccuracy: reportMetrics.bandAccuracy,
    factRecallAccuracy: reportMetrics.factRecallAccuracy,
    criticalFactAccuracy: reportMetrics.criticalFactAccuracy,
    materialRiskFlagCount: reportMetrics.materialRiskFlagCount,
    moderateRiskFlagCount: reportMetrics.moderateRiskFlagCount,
    configuredThreshold: 70,
  };

  return {
    id: result.resultId ?? result.attemptId,
    assessment: result.assessmentSlug,
    score:
      isScored && result.overallScore !== null ? `${result.overallScore}%` : "—",
    numericScore: isScored ? result.overallScore : null,
    assessmentStatus: isAbandoned
      ? "abandoned"
      : isScored
        ? "completed"
        : isSubmitted
          ? "submitted"
          : result.status === "in_progress"
            ? "in-progress"
            : result.status,
    passed: isScored ? result.meetsConfiguredStandard : null,
    completedAt: result.completedAt ?? result.submittedAt,
    wpm: typeof reportMetrics.wpm === "number" ? reportMetrics.wpm : null,
    accuracy:
      typeof reportMetrics.accuracy === "number" ? reportMetrics.accuracy : null,
    metrics,
    rawData: null,
  };
}
