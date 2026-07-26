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
import { rejectRateLimitedPortalRead } from "@/lib/security/api-rate-limit";

export async function GET(request: Request) {
  try {
    const { context, domainApi, firebaseSessionCookie } =
      await requireFirebaseRecruitmentSession("hiring_manager");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }

    const rateLimited = await rejectRateLimitedPortalRead(request, {
      scope: "hm-overview",
      actorId: context.firebaseUid,
      organizationId: context.organizationId,
    });
    if (rateLimited) return rateLimited;

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
    // assessment submit / scoring completion (Firestore), so a stale entry is
    // never served after a change.
    const portalCache = await domainApi
      .request<{ generation: string }>({
        path: `/v1/organizations/${encodeURIComponent(context.organizationId)}/portal-cache-generation`,
        firebaseSessionCookie,
      })
      .catch(() => ({ generation: "0" }));
    const generation = await readHmOverviewOrgGeneration(
      context.organizationId,
      { firestoreGeneration: portalCache.generation },
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
