import { NextRequest, NextResponse } from "next/server";
import { listClientSharedCandidates } from "@/services/client-portal.service";

export async function GET(request: NextRequest) {
  try {
    const reviewStatus = request.nextUrl.searchParams.get("reviewStatus") ?? undefined;
    const data = await listClientSharedCandidates(reviewStatus);
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Shared candidates could not be loaded",
      },
      { status: 500 }
    );
  }
}
