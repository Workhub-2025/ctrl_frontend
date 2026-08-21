import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import { mapFirebaseReportToHmResult } from "@/lib/hm-assessment-progress";
import type { FirebaseAssignmentAssessmentReport } from "@/lib/hm-assessment-progress";
import { buildCompositeStackEntries } from "@/lib/hiring-manager/campaign-stack-score";
import { computeDecisionReadyCompositeScore } from "@/lib/hiring-manager/composite-score";
import { readHmOverviewOrgGeneration } from "@/lib/portal-cache-invalidation";
import {
  PORTAL_USER_SCOPED_TTL_MS,
  portalHmReportCacheKeyWithGeneration,
} from "@/lib/portal-cache-keys";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";
import { rejectRateLimitedPortalRead } from "@/lib/security/api-rate-limit";
import type {
  HiringManagerAssessmentResult,
  HiringManagerCandidateReport,
} from "@/types/hiring-manager.types";

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

    const portalCache = actorContext.organizationId
      ? await domainApi
          .request<{ generation: string }>({
            path: `/v1/organizations/${encodeURIComponent(actorContext.organizationId)}/portal-cache-generation`,
            firebaseSessionCookie,
          })
          .catch(() => ({ generation: "0" }))
      : { generation: "0" };

    const generation = actorContext.organizationId
      ? await readHmOverviewOrgGeneration(actorContext.organizationId, {
          persistenceGeneration: portalCache.generation,
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
        const [workspace, assessmentResults] = await Promise.all([
          recruitment.getCampaign(detail.assignment.campaignId),
          domainApi.request<FirebaseAssignmentAssessmentReport[]>({
            path: `/v1/assessment-runtime/assignments/${encodeURIComponent(candidateSessionId)}/report`,
            firebaseSessionCookie,
          }),
        ]);
        const activeAssessmentStack = workspace.assessmentStack
          .filter((assessment) => assessment.status === "active")
          .sort((left, right) => left.position - right.position);
        const stackOrder = new Map(
          activeAssessmentStack.map((assessment, index) => [
            assessment.definitionId,
            index,
          ]),
        );
        const results: HiringManagerAssessmentResult[] = assessmentResults
          .map(mapFirebaseReportToHmResult)
          .sort(
            (left, right) =>
              (stackOrder.get(left.assessment) ?? Number.MAX_SAFE_INTEGER) -
                (stackOrder.get(right.assessment) ?? Number.MAX_SAFE_INTEGER) ||
              left.assessment.localeCompare(right.assessment),
          );
        const assessmentStack = activeAssessmentStack.map(
          (assessment) => assessment.definitionId,
        );
        const compositeScore = computeDecisionReadyCompositeScore(
          buildCompositeStackEntries({ assessmentStack }),
          results.filter((result) => result.assessmentStatus === "completed"),
        );
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
            resolvedStackSummary: null,
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
