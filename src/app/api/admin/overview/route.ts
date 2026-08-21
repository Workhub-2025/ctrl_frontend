import { NextResponse } from "next/server";

import {
  requireAdminDualAccess,
  type AdminDualAuthResult,
} from "@/lib/auth/admin-dual-access";
import {
  toAdminOverviewFromScreen,
} from "@/lib/firebase-admin-tenancy-bff";
import { createFirebaseScreenApi } from "@/lib/firebase-screen-api";
import {
  PORTAL_ADMIN_OVERVIEW_CACHE_KEY,
  PORTAL_ADMIN_PLATFORM_TTL_MS,
} from "@/lib/portal-cache-keys";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";
import { rejectRateLimitedPortalRead } from "@/lib/security/api-rate-limit";

export const dynamic = "force-dynamic";

function adminActorId(auth: Exclude<AdminDualAuthResult, { error: NextResponse }>) {
  const session = auth.session as { user: { firebaseUid?: string | null; id: string } };
  return session.user.firebaseUid ?? session.user.id;
}

async function loadAdminOverview(
  auth: Exclude<AdminDualAuthResult, { error: NextResponse }>,
) {
  const screens = createFirebaseScreenApi(auth.domainApi, auth.firebaseSessionCookie);
  const screen = await screens.getAdminOverview();
  return toAdminOverviewFromScreen(screen);
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

    const data = await portalServerCacheGetOrSet(
      PORTAL_ADMIN_OVERVIEW_CACHE_KEY,
      PORTAL_ADMIN_PLATFORM_TTL_MS,
      () => loadAdminOverview(auth),
    );
    return NextResponse.json({ data });
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
