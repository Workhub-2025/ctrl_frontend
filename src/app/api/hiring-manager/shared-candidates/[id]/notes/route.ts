import { NextRequest, NextResponse } from "next/server";
import { handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";
import { containsHtmlMarkup, sanitisePlainText } from "@/lib/security/input-sanitization";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");
    const { id } = await context.params;
    const detail = await recruitment.getAssignment(id);
    const data = detail.notes.map((note) => ({
      documentId: note.id,
      content: note.content,
      authorRole:
        note.actorPortalRole === "client" ? "client" : "hiring_manager",
      visibility:
        note.visibility === "internal"
          ? "client_only"
          : "hiring_manager_and_client",
      createdAt: note.createdAt,
      authorName: note.actorUserId,
      canDelete: false,
    }));
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

    const { session, context: actor, recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");
    const rateLimited = await rejectRateLimitedMutation(request, {
      scope: "hm:candidate-note:create",
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

    const result = await recruitment.addNote(id, {
      visibility: "organization",
      content,
      idempotencyKey: recruitmentIdempotencyKey(
        "candidate-assignment:note",
        actor.userId,
        { id, content },
      ),
    });
    const data = {
      documentId: result.noteId,
      content,
      authorRole: "hiring_manager",
      visibility: "hiring_manager_and_client",
      authorName: actor.userId,
      createdAt: new Date().toISOString(),
      canDelete: false,
    };
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleBffRouteError(error, "Note could not be saved");
  }
}
