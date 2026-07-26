import { NextRequest, NextResponse } from "next/server";
import { handleBffRouteError } from "@/lib/auth/bff-session";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ noteId: string }> }
) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { session } = await requireFirebaseRecruitmentSession("client");
    const rateLimited = await rejectRateLimitedMutation(request, {
      scope: "client:candidate-note:delete",
      actorId: session.user.id,
      limit: 30,
    });
    if (rateLimited) return rateLimited;
    await context.params;
    return NextResponse.json(
      { error: "Candidate notes are append-only audit evidence and cannot be deleted." },
      { status: 405, headers: { Allow: "GET, POST" } },
    );
  } catch (error) {
    return handleBffRouteError(error, "Note could not be deleted");
  }
}
