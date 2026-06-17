import { NextRequest, NextResponse } from "next/server";
import { updateSharedCandidateReviewStatus } from "@/services/client-portal.service";
import type { ClientSharedCandidate } from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireClientSession();

  const crossOriginResponse = rejectMutatingCrossOrigin(request);
  if (crossOriginResponse) return crossOriginResponse;

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      reviewStatus?: ClientSharedCandidate["reviewStatus"];
    };

    if (!body.reviewStatus) {
      return NextResponse.json({ error: "reviewStatus is required" }, { status: 400 });
    }

    const data = await updateSharedCandidateReviewStatus(id, body.reviewStatus);
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Review status could not be updated");
  
  }
}
