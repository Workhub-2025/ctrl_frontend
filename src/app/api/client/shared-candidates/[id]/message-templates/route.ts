import { NextResponse } from "next/server";
import { getSharedCandidateMessageTemplates } from "@/services/client-portal.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const data = await getSharedCandidateMessageTemplates(id);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Message templates could not be loaded",
      },
      { status: 500 }
    );
  }
}
