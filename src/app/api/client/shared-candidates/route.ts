import { NextRequest, NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import { createFirebaseScreenApi } from "@/lib/firebase-screen-api";
import { resolvePortalOrgGenerationFromDomain } from "@/lib/portal-cache-invalidation";
import {
  PORTAL_USER_SCOPED_TTL_MS,
  portalClientSharedCandidatesCacheKeyWithGeneration,
} from "@/lib/portal-cache-keys";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";
import { rejectRateLimitedPortalRead } from "@/lib/security/api-rate-limit";
import type { ClientSharedCandidate } from "@/types/client-portal";

export async function GET(request: NextRequest) {
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
      scope: "client-shared-candidates",
      actorId: context.firebaseUid,
      organizationId: context.organizationId,
    });
    if (rateLimited) return rateLimited;

    const requestedStatus =
      request.nextUrl.searchParams.get("reviewStatus") ?? undefined;

    const generation = await resolvePortalOrgGenerationFromDomain({
      organizationId: context.organizationId,
      domainApi,
      firebaseSessionCookie,
    });

    const data = await portalServerCacheGetOrSet(
      portalClientSharedCandidatesCacheKeyWithGeneration(
        context.firebaseUid,
        generation,
      ),
      PORTAL_USER_SCOPED_TTL_MS,
      async () => {
        const screens = createFirebaseScreenApi(domainApi, firebaseSessionCookie);
        const aggregate = await screens.getClientSharedCandidates();
        return (aggregate.items ?? []) as ClientSharedCandidate[];
      },
    );

    return NextResponse.json({
      data: requestedStatus
        ? data.filter((candidate) => candidate.reviewStatus === requestedStatus)
        : data,
    });
  } catch (error) {
    return handleBffRouteError(error, "Shared candidates could not be loaded");
  }
}
