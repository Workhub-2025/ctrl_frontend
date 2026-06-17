import { NextResponse } from "next/server";
import { getHiringManagerOverview } from "@/services/hiring-manager-campaigns.service";

import { requireHmSession, handleBffRouteError } from "@/lib/auth/bff-session";
export async function GET() {
  try {
    await requireHmSession();

    const result = await getHiringManagerOverview();

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        campaigns: result.campaigns,
        campaignDetails: result.campaignDetails,
        sessions: result.sessions,
      },
    });
  } catch (error) {
    return handleBffRouteError(error, "Overview could not be loaded");
  }
}
