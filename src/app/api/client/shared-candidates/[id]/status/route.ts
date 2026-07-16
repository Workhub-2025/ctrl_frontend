import { NextRequest, NextResponse } from "next/server";
import { updateSharedCandidateReviewStatus } from "@/services/client-portal.service";
import type { ClientSharedCandidate } from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { session } = await requireClientSession();

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
      reviewStatus?: ClientSharedCandidate["reviewStatus"];
    };

    if (!body.reviewStatus || !["pending_review", "reviewed", "progressed", "hired", "rejected"].includes(body.reviewStatus)) {
      return NextResponse.json({ error: "reviewStatus is required" }, { status: 400 });
    }

    const data = await updateSharedCandidateReviewStatus(id, body.reviewStatus);
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Review status could not be updated");
  }
}
