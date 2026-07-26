import { NextRequest, NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import {
  isCandidateAssessmentSubmitted,
} from "@/lib/candidate/assessment-progress";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import {
  PORTAL_CANDIDATE_WORKSPACE_TTL_MS,
  portalCandidateWorkspaceCacheKey,
} from "@/lib/portal-cache-keys";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";
import type { CandidatePortalApplication } from "@/services/candidate-session.service";

export async function GET(_request: NextRequest) {
  try {
    const { context: actor, recruitment } =
      await requireFirebaseRecruitmentSession("candidate");

    const loadWorkspace = async (): Promise<CandidatePortalApplication[]> => {
      const workspace = await recruitment.getCandidateWorkspace();
      return workspace.map(({ assignment, campaign, session, assessments }) => {
        const submittedCount = assessments.filter((assessment) =>
          isCandidateAssessmentSubmitted(assessment.status),
        ).length;
        const allSubmitted =
          assessments.length > 0 && submittedCount === assessments.length;
        const anyInProgress = assessments.some(
          (assessment) => assessment.status === "in_progress",
        );
        return {
          documentId: assignment.id,
          mode: session?.mode ?? campaign.assessmentMode,
          sessionStatus: session?.status ?? assignment.status,
          sessionStartsAt: session?.startsAt ?? null,
          portalStatus:
            assignment.status === "completed" || allSubmitted
              ? "completed"
              : anyInProgress
                ? "in_progress"
                : "awaiting_assessment",
          usedAt: assignment.updatedAt,
          completedAt:
            assignment.status === "completed" || allSubmitted
              ? assignment.updatedAt
              : null,
          completion: {
            completed: submittedCount,
            total: assessments.length,
          },
          campaign: {
            documentId: campaign.id,
            name: campaign.title,
            jobRole: campaign.jobRole,
            startDate: campaign.startDate,
            endDate: campaign.endDate,
            location: campaign.location,
          },
          assessmentSession: session
            ? {
                documentId: session.id,
                name: session.name,
                startsAt: session.startsAt,
                sessionStatus: session.status,
              }
            : null,
          assessments: assessments.map((assessment) => {
            const submitted = isCandidateAssessmentSubmitted(assessment.status);
            return {
              documentId: assessment.campaignAssessmentId,
              slug: assessment.slug,
              name: assessment.title,
              // Preserve submitted vs completed so the UI can show scoring vs done.
              status: assessment.status,
              isAvailable: !submitted,
              completedAt: submitted ? assignment.updatedAt : null,
            };
          }),
        };
      });
    };

    const data = await portalServerCacheGetOrSet(
      portalCandidateWorkspaceCacheKey(actor.firebaseUid),
      PORTAL_CANDIDATE_WORKSPACE_TTL_MS,
      loadWorkspace,
    );
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Candidate workspace could not be loaded");
  }
}
