import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { requireFirebaseTenancySession } from "@/lib/firebase-tenancy-bff";
import { loadClientBillingState } from "@/lib/client-billing-state";
import {
  PORTAL_USER_SCOPED_TTL_MS,
  portalClientEntitlementsCacheKey,
} from "@/lib/portal-cache-keys";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";
import { rejectRateLimitedPortalRead } from "@/lib/security/api-rate-limit";

export async function GET(request: Request) {
  try {
    const { context, tenancy, domainApi, firebaseSessionCookie } =
      await requireFirebaseTenancySession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }

    const rateLimited = await rejectRateLimitedPortalRead(request, {
      scope: "client-entitlements",
      actorId: context.firebaseUid,
      organizationId: context.organizationId,
    });
    if (rateLimited) return rateLimited;

    const data = await portalServerCacheGetOrSet(
      portalClientEntitlementsCacheKey(context.firebaseUid),
      PORTAL_USER_SCOPED_TTL_MS,
      async () => {
        const state = await loadClientBillingState({
          organizationId: context.organizationId!,
          tenancy,
          domainApi,
          firebaseSessionCookie,
        });
        return state.backendEntitlements;
      },
    );

    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Entitlements could not be loaded");
  }
}
