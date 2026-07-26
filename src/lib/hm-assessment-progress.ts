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
}>;

export function mapFirebaseReportToHmResult(
  result: FirebaseAssignmentAssessmentReport,
): HiringManagerAssessmentResult {
  const isScored = result.status === "scored";
  const isSubmitted =
    result.status === "submitted" || result.status === "scoring";
  const isAbandoned =
    result.status === "abandoned" || result.status === "failed";
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
    metrics: {
      attemptId: result.attemptId,
      campaignAssessmentId: result.campaignAssessmentId,
      releaseVersion: result.releaseVersion,
      revision: result.revision,
      criticalFlagCount: result.criticalFlagCount,
      attemptStatus: result.status,
    },
    rawData: null,
  };
}
