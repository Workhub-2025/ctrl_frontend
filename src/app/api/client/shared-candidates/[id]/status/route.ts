import { NextRequest, NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { session, context: actor, recruitment } =
      await requireFirebaseRecruitmentSession("client");

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const rateLimited = await rejectRateLimitedMutation(request, {
      scope: "client:candidate-outcome:update",
      actorId: session.user.id,
      limit: 30,
    });
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      reviewStatus?:
        | "pending_review"
        | "reviewed"
        | "progressed"
        | "hired"
        | "rejected";
    };

    if (!body.reviewStatus || !["pending_review", "reviewed", "progressed", "hired", "rejected"].includes(body.reviewStatus)) {
      return NextResponse.json({ error: "reviewStatus is required" }, { status: 400 });
    }

    const decision =
      body.reviewStatus === "progressed"
        ? "progress"
        : body.reviewStatus === "hired"
          ? "hire"
          : body.reviewStatus === "rejected"
            ? "reject"
            : body.reviewStatus === "pending_review"
              ? "reopen"
              : "hold";
    const result = await recruitment.addDecision(id, {
      decision,
      rationale: `Client review status changed to ${body.reviewStatus}`,
      idempotencyKey: recruitmentIdempotencyKey(
        "candidate-assignment:client-decision",
        actor.userId,
        {
          id,
          reviewStatus: body.reviewStatus,
          browserOperationId: request.headers.get("idempotency-key") ?? id,
        },
      ),
    });
    const data = {
      documentId: id,
      reviewStatus: body.reviewStatus,
      decisionId: result.decisionId,
      reviewStatusChangedAt: new Date().toISOString(),
    };
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Review status could not be updated");
  }
}
