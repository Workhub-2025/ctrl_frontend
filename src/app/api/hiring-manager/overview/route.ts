import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import {
  requireFirebaseRecruitmentSession,
  toHiringManagerCampaign,
  toHiringManagerCampaignDetail,
  toHiringManagerSession,
} from "@/lib/firebase-recruitment-bff";
import {
  createFirebaseScreenApi,
  toReportsByAssignmentId,
} from "@/lib/firebase-screen-api";
import { readHmOverviewOrgGeneration } from "@/lib/portal-cache-invalidation";
import {
  PORTAL_USER_SCOPED_TTL_MS,
  portalHmOverviewCacheKeyWithGeneration,
} from "@/lib/portal-cache-keys";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";

export async function GET() {
  try {
    const { context, domainApi, firebaseSessionCookie } =
      await requireFirebaseRecruitmentSession("hiring_manager");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }

    const screens = createFirebaseScreenApi(domainApi, firebaseSessionCookie);
    const loadOverview = async () => {
      const overview = await screens.getHiringManagerOverview();
      const reportsByAssignmentId = toReportsByAssignmentId(overview.reports);
      return {
        campaigns: overview.campaigns.map(({ workspace }) =>
          toHiringManagerCampaign(workspace.campaign, workspace),
        ),
        campaignDetails: overview.campaigns.map(({ workspace, assignments }) =>
          toHiringManagerCampaignDetail(
            workspace,
            assignments,
            reportsByAssignmentId,
          ),
        ),
        sessions: overview.campaigns.flatMap(({ workspace, assignments }) =>
          workspace.sessions.map((session) =>
            toHiringManagerSession(
              session,
              workspace.campaign.title,
              assignments,
              reportsByAssignmentId,
            ),
          ),
        ),
      };
    };

    // The generation suffix is rotated by every tenant mutation and by
    // assessment submit, so a stale entry is never served after a change.
    const generation = await readHmOverviewOrgGeneration(
      context.organizationId,
    );
    const data = await portalServerCacheGetOrSet(
      portalHmOverviewCacheKeyWithGeneration(context.firebaseUid, generation),
      PORTAL_USER_SCOPED_TTL_MS,
      loadOverview,
    );

    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return handleBffRouteError(error, "Overview could not be loaded");
  }
}
