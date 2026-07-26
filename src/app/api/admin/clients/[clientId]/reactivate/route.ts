import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import { invalidateAdminPlatformServerCache } from "@/lib/portal-cache-invalidation";
import { getCmsApiBaseUrl, joinCmsApiPath } from "@/legacy-cms/server-url";
import { getCmsErrorStatus } from "@/services/admin-platform.service";
import type { FirebaseOrganization } from "@/lib/firebase-admin-tenancy-bff";

type RouteContext = {
  params: Promise<{ clientId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdminDualAccess("clients.write");
    if ("error" in auth) return auth.error;

    const { clientId } = await context.params;
    if (isFirebaseAdminAuth(auth)) {
      const organization = await auth.domainApi.request<FirebaseOrganization>({
        path: `/v1/organizations/${encodeURIComponent(clientId)}/lifecycle`,
        method: "POST",
        firebaseSessionCookie: auth.firebaseSessionCookie,
        body: { status: "active" },
      });
      void invalidateAdminPlatformServerCache();
      return NextResponse.json({ data: organization });
    }

    const response = await fetch(
      joinCmsApiPath(
        getCmsApiBaseUrl(),
        `/admin/clients/${encodeURIComponent(clientId)}/reactivate`,
      ),
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.cmsJwt}`,
        },
      },
    );

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        body?.error?.message ||
        body?.error ||
        body?.message ||
        `Strapi responded ${response.status}`;
      return NextResponse.json({ error: message }, { status: response.status });
    }

    void invalidateAdminPlatformServerCache();
    return NextResponse.json(body);
  } catch (error) {
    const upstreamStatus = getCmsErrorStatus(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Client could not be reactivated",
      },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 },
    );
  }
}
