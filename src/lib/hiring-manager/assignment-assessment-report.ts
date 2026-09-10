import "server-only";

import { mapFirebaseReportToHmResult } from "@/lib/hm-assessment-progress";
import type { FirebaseAssignmentAssessmentReport } from "@/lib/hm-assessment-progress";
import type { FirebaseCampaignWorkspace } from "@/lib/firebase-recruitment-api";
import {
  normalizeResolvedStackSummary,
} from "@/lib/hiring-manager/campaign-stack-score";
import type {
  HiringManagerAssessmentResult,
  HiringManagerResolvedStackSummary,
} from "@/types/hiring-manager.types";

export type AssignmentAssessmentReport = Readonly<{
  results: HiringManagerAssessmentResult[];
  compositeScore: number | null;
  assessmentStack: string[];
  resolvedStackSummary: HiringManagerResolvedStackSummary | null;
}>;

/**
 * Shape the raw runtime report into the portal projection.
 *
 * Shared by the hiring-manager report and the client review queue so both see
 * the same scores, the same weighting and the same ordering — a client deciding
 * on a candidate must not be looking at a different number from the manager who
 * released them.
 */
export function buildAssignmentAssessmentReport(input: {
  workspace: FirebaseCampaignWorkspace;
  assessmentReports: readonly FirebaseAssignmentAssessmentReport[];
}): AssignmentAssessmentReport {
  const activeStack = input.workspace.assessmentStack
    .filter((assessment) => assessment.status === "active")
    .sort((left, right) => left.position - right.position);

  // Results and every portal matcher are keyed by assessment slug, not by the
  // definition id the stack is stored against.
  const resolvedStack = activeStack.map((assessment) => ({
    documentId: assessment.id,
    slug: assessment.slug,
    displayName: assessment.title || assessment.slug,
    weight: assessment.weight,
  }));

  const reportByAssignment = new Map(input.assessmentReports.map((report) => [report.campaignAssessmentId, report]));
  const allWeighted = activeStack.length > 0 && activeStack.every((item) => typeof item.weight === "number");
  const weightTotal = allWeighted ? activeStack.reduce((sum, item) => sum + (item.weight ?? 0), 0) : 0;
  const results = activeStack.map((assessment): HiringManagerAssessmentResult => {
    const report = reportByAssignment.get(assessment.id);
    const weight = allWeighted && weightTotal > 0 ? (assessment.weight ?? 0) * 100 / weightTotal : 100 / activeStack.length;
    const result = report ? mapFirebaseReportToHmResult(report) : {
      id: assessment.id, assessment: assessment.slug, score: "—", numericScore: null,
      assessmentStatus: "not-started", passed: null, metrics: { campaignAssessmentId: assessment.id, releaseId: assessment.releaseId, evidenceAvailability: "pending" }
    };
    return { ...result, campaignAssessmentId: assessment.id, title: assessment.title || assessment.slug, weight };
  });

  // A campaign is weighted only when every active module carries a weight; a
  // partially weighted stack falls back to an equal split rather than silently
  // under-counting a module.
  const fullyWeighted =
    resolvedStack.length > 0 &&
    resolvedStack.every((assessment) => typeof assessment.weight === "number");
  const resolvedStackSummary = fullyWeighted
    ? normalizeResolvedStackSummary({
        assessments: resolvedStack.map((assessment) => ({
          documentId: assessment.documentId,
          slug: assessment.slug,
          displayName: assessment.displayName,
          weight: assessment.weight ?? 0,
        })),
        resolvedAt: input.workspace.campaign.updatedAt,
      })
    : null;

  const assessmentStack = resolvedStack.map((assessment) => assessment.slug);

  return {
    results,
    assessmentStack,
    resolvedStackSummary,
    compositeScore: results.length > 0 && results.every(result => result.assessmentStatus === "completed" && typeof result.numericScore === "number" && Number.isFinite(result.numericScore))
      ? Math.round(results.reduce((total, result) => total + result.numericScore! * (result.weight ?? 0) / 100, 0)) : null,
  };
}
