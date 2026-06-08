import { NextResponse } from "next/server";
import { getHiringManagerOverview } from "@/services/hiring-manager-campaigns.service";

export async function GET() {
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
}
