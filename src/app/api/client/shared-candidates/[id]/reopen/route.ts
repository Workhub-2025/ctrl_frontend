import { NextRequest, NextResponse } from "next/server";
import { handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";
import { containsHtmlMarkup, sanitisePlainText } from "@/lib/security/input-sanitization";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;
    const { session, context: actor, recruitment } =
      await requireFirebaseRecruitmentSession("client");
    const rateLimited = await rejectRateLimitedMutation(request, {
      scope: "client:candidate-outcome:reopen",
      actorId: session.user.id,
      limit: 10,
    });
    if (rateLimited) return rateLimited;

    const body = (await request.json().catch(() => ({}))) as { reason?: string };
    if (containsHtmlMarkup(body.reason)) {
      return NextResponse.json({ error: "Reopen reason must be plain text" }, { status: 400 });
    }
    const reason = sanitisePlainText(body.reason, { maxLength: 500, allowNewlines: true });
    if (reason.length < 3) {
      return NextResponse.json({ error: "A reopen reason is required" }, { status: 400 });
    }
    const { id } = await context.params;
    const result = await recruitment.addDecision(id, {
      decision: "reopen",
      rationale: reason,
      idempotencyKey: recruitmentIdempotencyKey(
        "candidate-assignment:client-reopen",
        actor.userId,
        {
          id,
          reason,
          browserOperationId: request.headers.get("idempotency-key") ?? id,
        },
      ),
    });
    const data = {
      documentId: id,
      reviewStatus: "pending_review",
      decisionId: result.decisionId,
      reviewStatusChangedAt: new Date().toISOString(),
    };
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Candidate outcome could not be reopened");
  }
}
