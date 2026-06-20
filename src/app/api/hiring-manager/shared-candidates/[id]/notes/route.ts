import { NextRequest, NextResponse } from "next/server";
import {
  createSharedCandidateNote,
  listSharedCandidateNotes,
} from "@/services/shared-candidate-notes.service";
import { requireHmSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { strapiJwt } = await requireHmSession();
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

    const { strapiJwt } = await requireHmSession();
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { content?: string };
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const data = await createSharedCandidateNote(id, content, strapiJwt);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return handleBffRouteError(error, "Note could not be saved");
  }
}
