import { NextRequest } from "next/server";
import {
  handleSharedCandidateNotesGet,
  handleSharedCandidateNotesPost,
} from "@/lib/portal-shared-notes-bff";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleSharedCandidateNotesGet(request, context.params, "client");
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  return handleSharedCandidateNotesPost(request, context.params, "client");
}
