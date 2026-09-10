import { NextResponse, type NextRequest } from "next/server";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import { handleBffRouteError } from "@/lib/auth/bff-session";
import { reportEvidenceSchema } from "@/lib/assessment-report-contract";
import { rejectRateLimitedPortalRead } from "@/lib/security/api-rate-limit";

export async function GET(request: NextRequest, context: {params: Promise<{candidateSessionId: string; campaignAssessmentId: string}>}) {
  try {
    const {context: actor, domainApi, firebaseSessionCookie} = await requireFirebaseRecruitmentSession("hiring_manager");
    if (actor.organizationId) {
      const limited = await rejectRateLimitedPortalRead(request, {scope: "hm-candidate-evidence", actorId: actor.firebaseUid, organizationId: actor.organizationId});
      if (limited) return limited;
    }
    const {candidateSessionId, campaignAssessmentId} = await context.params;
    const evidence = await domainApi.request<unknown>({
      path: `/v1/assessment-runtime/assignments/${encodeURIComponent(candidateSessionId)}/report/assessments/${encodeURIComponent(campaignAssessmentId)}/evidence`, firebaseSessionCookie
    });
    return NextResponse.json({data: reportEvidenceSchema.parse(evidence)}, {headers: {"Cache-Control": "no-store"}});
  } catch (error) { return handleBffRouteError(error, "Candidate responses could not be loaded"); }
}
