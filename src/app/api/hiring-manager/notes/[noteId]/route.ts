import { NextRequest, NextResponse } from "next/server";
import { deleteSharedCandidateNote } from "@/services/shared-candidate-notes.service";
import { requireHmSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ noteId: string }> }
) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { session } = await requireHmSession();
    const rateLimited = await rejectRateLimitedMutation(request, {
      scope: "hm:candidate-note:delete",
      actorId: session.user.id,
      limit: 30,
    });
    if (rateLimited) return rateLimited;
    const { noteId } = await context.params;
    await deleteSharedCandidateNote(noteId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleBffRouteError(error, "Note could not be deleted");
  }
}
