import { NextResponse } from "next/server";
import { handleBffRouteError } from "@/lib/auth/bff-session";
import {
  requireFirebaseRecruitmentSession,
  toClientCampaignWorkspace,
} from "@/lib/firebase-recruitment-bff";

export async function GET(
  _request: Request,
  context: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { recruitment } = await requireFirebaseRecruitmentSession("client");
    const { campaignId } = await context.params;
    const [workspace, assignments] = await Promise.all([
      recruitment.getCampaign(campaignId),
      recruitment.listAssignments(campaignId),
    ]);
    const data = toClientCampaignWorkspace(workspace, assignments.items);
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Campaign could not be loaded");
  }
}
