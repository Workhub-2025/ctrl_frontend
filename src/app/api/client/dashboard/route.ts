import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { toClientOverviewFromScreen } from "@/lib/firebase-client-portal-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import { createFirebaseScreenApi } from "@/lib/firebase-screen-api";
import { resolvePortalOrgGenerationFromDomain } from "@/lib/portal-cache-invalidation";
import {
  PORTAL_USER_SCOPED_TTL_MS,
  portalClientDashboardCacheKeyWithGeneration,
} from "@/lib/portal-cache-keys";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";
import { rejectRateLimitedPortalRead } from "@/lib/security/api-rate-limit";

export async function GET(request: Request) {
  try {
    const { context, domainApi, firebaseSessionCookie } =
      await requireFirebaseRecruitmentSession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organisation membership is required" },
        { status: 403 },
      );
    }

    const rateLimited = await rejectRateLimitedPortalRead(request, {
      scope: "client-dashboard",
      actorId: context.firebaseUid,
      organizationId: context.organizationId,
    });
    if (rateLimited) return rateLimited;

    const screens = createFirebaseScreenApi(domainApi, firebaseSessionCookie);
    const loadDashboard = async () => {
      const dashboard = await screens.getClientDashboard();
      return toClientOverviewFromScreen(dashboard);
    };

    // Shares the org generation with the HM overview: seat, campaign and
    // candidate changes move counts on both screens. Max of the local cache
    // generation and the persistence generation covers synchronous BFF busts
    // and asynchronous scoring completion.
    const generation = await resolvePortalOrgGenerationFromDomain({
      organizationId: context.organizationId,
      domainApi,
      firebaseSessionCookie,
    });
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
