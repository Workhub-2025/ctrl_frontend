import { NextResponse } from "next/server";
import { getSharedCandidateMessageTemplates } from "@/services/client-portal.service";
import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireClientSession();
    const { id } = await context.params;
    const data = await getSharedCandidateMessageTemplates(id);
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Message templates could not be loaded");
  }
}
