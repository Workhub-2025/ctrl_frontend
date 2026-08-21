import { NextResponse } from "next/server";

import {
  requireAdminDualAccess,
  type AdminDualAuthResult,
} from "@/lib/auth/admin-dual-access";
import {
  buildFirebaseAdminRevenueAnalytics,
  emptyFirebaseAdminRevenueAnalytics,
} from "@/lib/firebase-admin-analytics";
import type { FirebaseOrganization } from "@/lib/firebase-admin-tenancy-bff";
import { createFirebaseBillingApi } from "@/lib/firebase-billing-api";
import {
  PORTAL_ADMIN_ANALYTICS_CACHE_KEY,
  PORTAL_ADMIN_PLATFORM_TTL_MS,
} from "@/lib/portal-cache-keys";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";
import { rejectRateLimitedPortalRead } from "@/lib/security/api-rate-limit";

function adminActorId(auth: Exclude<AdminDualAuthResult, { error: NextResponse }>) {
  const session = auth.session as { user: { firebaseUid?: string | null; id: string } };
  return session.user.firebaseUid ?? session.user.id;
}

async function loadAdminAnalytics(
  auth: Exclude<AdminDualAuthResult, { error: NextResponse }>,
) {
  const billing = createFirebaseBillingApi(
    auth.domainApi,
    auth.firebaseSessionCookie,
  );

  const [organizations, billingRequests, pricesResult] = await Promise.all([
    auth.domainApi
      .request<FirebaseOrganization[]>({
        path: "/v1/organizations",
        firebaseSessionCookie: auth.firebaseSessionCookie,
      })
      .catch(() => [] as FirebaseOrganization[]),
    billing.listAdminBillingRequests().catch(() => []),
    billing.listPrices().catch(() => ({ prices: [] })),
  ]);

  const contracts = (
    await Promise.all(
      organizations.map((organization) =>
        billing
          .listOrganizationContracts(organization.id)
          .catch(() => [] as Awaited<
            ReturnType<typeof billing.listOrganizationContracts>
          >),
      ),
    )
  ).flat();

  return buildFirebaseAdminRevenueAnalytics({
    organizations,
    contracts,
    billingRequests,
    prices: pricesResult.prices ?? [],
  });
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdminDualAccess("analytics.read");
    if ("error" in auth) return auth.error;

    const rateLimited = await rejectRateLimitedPortalRead(request, {
      scope: "admin-analytics",
      actorId: adminActorId(auth),
    });
    if (rateLimited) return rateLimited;

    const data = await portalServerCacheGetOrSet(
      PORTAL_ADMIN_ANALYTICS_CACHE_KEY,
      PORTAL_ADMIN_PLATFORM_TTL_MS,
      () => loadAdminAnalytics(auth),
    );
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({
      data: emptyFirebaseAdminRevenueAnalytics(),
      warning:
        error instanceof Error
          ? error.message
          : "Revenue analytics could not be fully loaded",
    });
  }
}
