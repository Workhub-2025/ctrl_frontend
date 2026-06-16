import { NextRequest, NextResponse } from "next/server";
import { updateSharedCandidateReviewStatus } from "@/services/client-portal.service";
import type { ClientSharedCandidate } from "@/services/client-portal.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
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
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Review status could not be updated",
      },
      { status: 500 }
    );
  }
}
