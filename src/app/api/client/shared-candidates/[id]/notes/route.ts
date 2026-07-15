import { NextRequest, NextResponse } from "next/server";
import {
  createSharedCandidateNote,
  listSharedCandidateNotes,
} from "@/services/shared-candidate-notes.service";
import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";
import { containsHtmlMarkup, sanitisePlainText } from "@/lib/security/input-sanitization";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { strapiJwt } = await requireClientSession();
    const { id } = await context.params;
    const data = await listSharedCandidateNotes(id, strapiJwt);
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Notes could not be loaded");
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { session, strapiJwt } = await requireClientSession();
    const rateLimited = await rejectRateLimitedMutation(request, {
      scope: "client:candidate-note:create",
      actorId: session.user.id,
      limit: 20,
    });
    if (rateLimited) return rateLimited;

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { content?: string };
    if (containsHtmlMarkup(body.content)) {
      return NextResponse.json({ error: "Notes must be plain text" }, { status: 400 });
    }
    const content = sanitisePlainText(body.content, { maxLength: 2_000, allowNewlines: true });

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const data = await createSharedCandidateNote(id, content, strapiJwt);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleBffRouteError(error, "Note could not be saved");
  }
}
