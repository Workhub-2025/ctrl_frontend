import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
  type AdminDualAuthResult,
} from "@/lib/auth/admin-dual-access";
import {
  toAdminOverviewFromOrganizations,
  type FirebaseClientTeamWorkspace,
  type FirebaseOrganization,
} from "@/lib/firebase-admin-tenancy-bff";
import {
  PORTAL_ADMIN_OVERVIEW_CACHE_KEY,
  PORTAL_ADMIN_PLATFORM_TTL_MS,
} from "@/lib/portal-cache-keys";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";
import { rejectRateLimitedPortalRead } from "@/lib/security/api-rate-limit";
import { getAdminOverview } from "@/services/admin-platform.service";

export const dynamic = "force-dynamic";

function adminActorId(auth: Exclude<AdminDualAuthResult, { error: NextResponse }>) {
  const session = auth.session as { user: { firebaseUid?: string | null; id: string } };
  return session.user.firebaseUid ?? session.user.id;
}

async function loadFirebaseAdminOverview(
  auth: Extract<
    Exclude<AdminDualAuthResult, { error: NextResponse }>,
    { domainApi: unknown }
  >,
) {
  const organizations = await auth.domainApi.request<FirebaseOrganization[]>({
    path: "/v1/organizations",
    firebaseSessionCookie: auth.firebaseSessionCookie,
  });
  const workspaces = await Promise.all(
    organizations.map((organization) =>
      auth.domainApi.request<FirebaseClientTeamWorkspace>({
        path: `/v1/organizations/${encodeURIComponent(organization.id)}/workspace`,
        firebaseSessionCookie: auth.firebaseSessionCookie,
      }),
    ),
  );
  return toAdminOverviewFromOrganizations(organizations, workspaces);
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdminDualAccess("platform.overview");
    if ("error" in auth) return auth.error;

    const rateLimited = await rejectRateLimitedPortalRead(request, {
      scope: "admin-overview",
      actorId: adminActorId(auth),
    });
    if (rateLimited) return rateLimited;

    if (isFirebaseAdminAuth(auth)) {
      const data = await portalServerCacheGetOrSet(
        PORTAL_ADMIN_OVERVIEW_CACHE_KEY,
        PORTAL_ADMIN_PLATFORM_TTL_MS,
        () => loadFirebaseAdminOverview(auth),
      );
      return NextResponse.json({ data });
    }

    const overview = await getAdminOverview(auth.cmsJwt);
    return NextResponse.json({ data: overview });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Admin overview could not be loaded",
      },
      { status: 500 },
    );
  }
}
