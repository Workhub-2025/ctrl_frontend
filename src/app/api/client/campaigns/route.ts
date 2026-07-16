import { NextRequest, NextResponse } from "next/server";
import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { getClientCampaigns } from "@/services/client-portal.service";

export async function GET(request: NextRequest) {
  try {
    await requireClientSession();
    const status = request.nextUrl.searchParams.get("status");
    if (status && !["pending", "approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "status must be pending, approved, or rejected" },
        { status: 400 }
      );
    }
    const data = await getClientCampaigns(
      status as "pending" | "approved" | "rejected" | undefined
    );
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Campaigns could not be loaded");
  }
}
