import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { invalidateAdminPlatformServerCache } from "@/lib/portal-cache-invalidation";
import type { FirebaseOrganization } from "@/lib/firebase-admin-tenancy-bff";

type RouteContext = {
  params: Promise<{ clientId: string }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdminDualAccess("clients.write");
    if ("error" in auth) return auth.error;

    const { clientId } = await context.params;
    const organization = await auth.domainApi.request<FirebaseOrganization>({
      path: `/v1/organizations/${encodeURIComponent(clientId)}/lifecycle`,
      method: "POST",
      firebaseSessionCookie: auth.firebaseSessionCookie,
      body: { status: "active" },
    });
    void invalidateAdminPlatformServerCache();
    return NextResponse.json({ data: organization });
  } catch (error) {
    return handleBffRouteError(error, "Client could not be reactivated");
  }
}
