import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import type { FirebaseAssignmentAssessmentReport } from "@/lib/hm-assessment-progress";
import { buildAssignmentAssessmentReport } from "@/lib/hiring-manager/assignment-assessment-report";
import { resolvePortalOrgGenerationFromDomain } from "@/lib/portal-cache-invalidation";
import {
  PORTAL_USER_SCOPED_TTL_MS,
  portalHmReportCacheKeyWithGeneration,
} from "@/lib/portal-cache-keys";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";
import { rejectRateLimitedPortalRead } from "@/lib/security/api-rate-limit";
import type { HiringManagerCandidateReport } from "@/types/hiring-manager.types";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ candidateSessionId: string }> },
) {
  try {
    const { context: actorContext, domainApi, firebaseSessionCookie, recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");
    const { candidateSessionId } = await context.params;

    if (actorContext.organizationId) {
      const rateLimited = await rejectRateLimitedPortalRead(request, {
        scope: "hm-candidate-report",
        actorId: actorContext.firebaseUid,
        organizationId: actorContext.organizationId,
      });
      if (rateLimited) return rateLimited;
    }

    const generation = actorContext.organizationId
      ? await resolvePortalOrgGenerationFromDomain({
          organizationId: actorContext.organizationId,
          domainApi,
          firebaseSessionCookie,
        })
      : "0";

    const report = await portalServerCacheGetOrSet(
      portalHmReportCacheKeyWithGeneration(
        actorContext.firebaseUid,
        candidateSessionId,
        generation,
      ),
      PORTAL_USER_SCOPED_TTL_MS,
      async () => {
        const detail = await recruitment.getAssignment(candidateSessionId);
        const [workspace, assessmentReports] = await Promise.all([
          recruitment.getCampaign(detail.assignment.campaignId),
          domainApi.request<FirebaseAssignmentAssessmentReport[]>({
            path: `/v1/assessment-runtime/assignments/${encodeURIComponent(candidateSessionId)}/report`,
            firebaseSessionCookie,
          }),
        ]);
        const { results, compositeScore, assessmentStack, resolvedStackSummary } =
          buildAssignmentAssessmentReport({ workspace, assessmentReports });

        const assessmentSession = detail.assignment.sessionId
          ? workspace.sessions.find(
              (session) => session.id === detail.assignment.sessionId,
            ) ?? null
          : null;
        const latestDecision = detail.decisions.at(0) as
          | {
              decision?: "progress" | "hold" | "reject" | "hire" | "reopen";
              rationale?: string;
              createdAt?: string;
            }
          | undefined;
        const candidateReport: HiringManagerCandidateReport = {
          sessionId: detail.assignment.id,
          candidate: {
            documentId: detail.assignment.candidateUserId,
            name: detail.assignment.inviteEmail,
            email: detail.assignment.inviteEmail,
          },
          campaign: {
            documentId: workspace.campaign.id,
            name: workspace.campaign.title,
            role: workspace.campaign.jobRole,
            assessmentSettings: null,
            resolvedStackSummary,
            assessmentStack,
          },
          assessmentSession: assessmentSession
            ? {
                documentId: assessmentSession.id,
                name: assessmentSession.name,
                startsAt: assessmentSession.startsAt,
              }
            : null,
          results,
          compositeScore,
          hmDecision:
            latestDecision?.decision === "reject"
              ? "rejected"
              : latestDecision?.decision === "progress"
                ? "approved"
                : "pending",
          hmDecisionAt: latestDecision?.createdAt ?? null,
          hmDecisionNote: latestDecision?.rationale ?? null,
          sharedCandidateDocumentId:
            detail.assignment.visibility === "released"
              ? detail.assignment.id
              : null,
          clientReviewStatus:
            detail.assignment.visibility === "released" ? "pending_review" : null,
          clientReviewStatusChangedAt:
            detail.assignment.visibility === "released"
              ? detail.assignment.updatedAt
              : null,
        };
        return candidateReport;
      },
    );

    return NextResponse.json(
      { data: report },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleBffRouteError(error, "Candidate report could not be loaded");
  }
}
