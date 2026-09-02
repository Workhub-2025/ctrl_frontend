import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import { buildAssignmentAssessmentReport } from "@/lib/hiring-manager/assignment-assessment-report";
import type { FirebaseAssignmentAssessmentReport } from "@/lib/hm-assessment-progress";
import { resolvePortalOrgGenerationFromDomain } from "@/lib/portal-cache-invalidation";
import {
  PORTAL_USER_SCOPED_TTL_MS,
  portalClientSharedCandidateReportCacheKeyWithGeneration,
} from "@/lib/portal-cache-keys";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";
import { rejectRateLimitedPortalRead } from "@/lib/security/api-rate-limit";

/**
 * Assessment evidence for a candidate a hiring manager has released to the
 * client. The backend enforces the release gate; without it a client would be
 * recording hire and reject decisions with no visibility of the scores.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ assignmentId: string }> },
) {
  try {
    const { context: actorContext, domainApi, firebaseSessionCookie, recruitment } =
      await requireFirebaseRecruitmentSession("client");
    const { assignmentId } = await context.params;

    if (!actorContext.organizationId) {
      return NextResponse.json(
        { error: "Organisation membership is required" },
        { status: 403 },
      );
    }

    const rateLimited = await rejectRateLimitedPortalRead(request, {
      scope: "client-shared-candidate-report",
      actorId: actorContext.firebaseUid,
      organizationId: actorContext.organizationId,
    });
    if (rateLimited) return rateLimited;

    const generation = await resolvePortalOrgGenerationFromDomain({
      organizationId: actorContext.organizationId,
      domainApi,
      firebaseSessionCookie,
    });

    const report = await portalServerCacheGetOrSet(
      portalClientSharedCandidateReportCacheKeyWithGeneration(
        actorContext.firebaseUid,
        assignmentId,
        generation,
      ),
      PORTAL_USER_SCOPED_TTL_MS,
      async () => {
        const detail = await recruitment.getAssignment(assignmentId);
        const [workspace, assessmentReports] = await Promise.all([
          recruitment.getCampaign(detail.assignment.campaignId),
          domainApi.request<FirebaseAssignmentAssessmentReport[]>({
            path: `/v1/assessment-runtime/assignments/${encodeURIComponent(assignmentId)}/report`,
            firebaseSessionCookie,
          }),
        ]);
        return buildAssignmentAssessmentReport({ workspace, assessmentReports });
      },
    );

    return NextResponse.json(
      { data: report },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleBffRouteError(
      error,
      "Candidate assessment report could not be loaded",
    );
  }
}
