import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClientCampaignApprovals } from "@/services/client-portal.service";

export async function GET(request: NextRequest) {
  try {
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
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Campaign approvals could not be loaded",
      },
      { status: 500 }
    );
  }
}
