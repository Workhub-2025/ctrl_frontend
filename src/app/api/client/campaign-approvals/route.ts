import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClientCampaignApprovals } from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
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

    const campaigns = await getClientCampaignApprovals(
      status as "pending" | "approved" | "rejected" | undefined
    );
    return NextResponse.json({ data: campaigns });
  } catch (error) {
    return handleBffRouteError(error, "Campaign approvals could not be loaded");
  
  }
}
