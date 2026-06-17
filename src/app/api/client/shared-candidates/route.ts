import { NextRequest, NextResponse } from "next/server";
import { listClientSharedCandidates } from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
export async function GET(request: NextRequest) {
  try {
    await requireClientSession();

    const reviewStatus = request.nextUrl.searchParams.get("reviewStatus") ?? undefined;
    const data = await listClientSharedCandidates(reviewStatus);
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Shared candidates could not be loaded");
  
  }
}
