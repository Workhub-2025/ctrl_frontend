import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { toClientDashboardSummary } from "@/lib/firebase-client-portal-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import { createFirebaseScreenApi } from "@/lib/firebase-screen-api";
import { readHmOverviewOrgGeneration } from "@/lib/portal-cache-invalidation";
import {
  PORTAL_USER_SCOPED_TTL_MS,
  portalClientDashboardCacheKeyWithGeneration,
} from "@/lib/portal-cache-keys";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";

export async function GET() {
  try {
    const { context, domainApi, firebaseSessionCookie } =
      await requireFirebaseRecruitmentSession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }

    const screens = createFirebaseScreenApi(domainApi, firebaseSessionCookie);
    const loadDashboard = async () => {
      const dashboard = await screens.getClientDashboard();
      return toClientDashboardSummary(
        dashboard.workspace,
        dashboard.campaigns,
        dashboard.releasedAssignmentCount,
      );
    };

    // Shares the org generation with the HM overview: seat, campaign and
    // candidate changes move counts on both screens.
    const generation = await readHmOverviewOrgGeneration(
      context.organizationId,
    );
    const data = await portalServerCacheGetOrSet(
      portalClientDashboardCacheKeyWithGeneration(
        context.firebaseUid,
        generation,
      ),
      PORTAL_USER_SCOPED_TTL_MS,
      loadDashboard,
    );

    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Client dashboard could not be loaded");
  }
}
