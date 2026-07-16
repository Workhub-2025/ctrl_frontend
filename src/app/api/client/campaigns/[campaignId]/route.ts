import { NextResponse } from "next/server";
import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { getClientCampaignWorkspace } from "@/services/client-portal.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ campaignId: string }> }
) {
  try {
    await requireClientSession();
    const { campaignId } = await context.params;
    const data = await getClientCampaignWorkspace(campaignId);
    if (!data) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Campaign could not be loaded");
  }
}
