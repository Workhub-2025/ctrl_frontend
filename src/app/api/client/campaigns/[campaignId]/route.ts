import { NextResponse } from "next/server";
import { handleBffRouteError } from "@/lib/auth/bff-session";
import {
  campaignOwnerName,
  createFirebaseClientPortalApi,
} from "@/lib/firebase-client-portal-api";
import {
  requireFirebaseRecruitmentSession,
  toClientCampaignWorkspace,
} from "@/lib/firebase-recruitment-bff";

export async function GET(
  _request: Request,
  context: { params: Promise<{ campaignId: string }> }
) {
  try {
    const {
      recruitment,
      context: actor,
      domainApi,
      firebaseSessionCookie,
    } = await requireFirebaseRecruitmentSession("client");
    const { campaignId } = await context.params;
    const portal = createFirebaseClientPortalApi(domainApi, firebaseSessionCookie);
    const [workspace, assignments, team] = await Promise.all([
      recruitment.getCampaign(campaignId),
      recruitment.listAssignments(campaignId),
      // A missing name must not hide the campaign itself.
      actor.organizationId
        ? portal.getTeamWorkspace(actor.organizationId).catch(() => null)
        : Promise.resolve(null),
    ]);
    const data = toClientCampaignWorkspace(
      workspace,
      assignments.items,
      team ? campaignOwnerName(team, workspace.campaign.ownerSeatId) : undefined,
    );
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Campaign could not be loaded");
  }
}
