import "server-only";

import { mapFirebaseReportToHmResult } from "@/lib/hm-assessment-progress";
import type { FirebaseAssignmentAssessmentReport } from "@/lib/hm-assessment-progress";
import type { FirebaseCampaignWorkspace } from "@/lib/firebase-recruitment-api";
import {
  buildCompositeStackEntries,
  normalizeResolvedStackSummary,
} from "@/lib/hiring-manager/campaign-stack-score";
import { computeDecisionReadyCompositeScore } from "@/lib/hiring-manager/composite-score";
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

  const stackOrder = new Map(
    resolvedStack.map((assessment, index) => [assessment.slug, index]),
  );
  const results = input.assessmentReports
    .map(mapFirebaseReportToHmResult)
    .sort(
      (left, right) =>
        (stackOrder.get(left.assessment) ?? Number.MAX_SAFE_INTEGER) -
          (stackOrder.get(right.assessment) ?? Number.MAX_SAFE_INTEGER) ||
        left.assessment.localeCompare(right.assessment),
    );

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
    compositeScore: computeDecisionReadyCompositeScore(
      buildCompositeStackEntries({ assessmentStack, resolvedStackSummary }),
      results.filter((result) => result.assessmentStatus === "completed"),
    ),
  };
}
