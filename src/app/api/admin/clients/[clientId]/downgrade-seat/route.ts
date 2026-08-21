import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { downgradeAdminSeat } from "@/lib/firebase-admin-seat-ops";
import { invalidateAdminPlatformServerCache } from "@/lib/portal-cache-invalidation";

type RouteContext = {
  params: Promise<{ clientId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminDualAccess("clients.write");
  if ("error" in auth) return auth.error;

  try {
    const { clientId } = await context.params;
    const body = await request.json().catch(() => ({})) as {
      managerDocumentId?: string;
      accessCodeDocumentId?: string;
    };

    const data = await downgradeAdminSeat({
      domainApi: auth.domainApi,
      firebaseSessionCookie: auth.firebaseSessionCookie,
      organizationId: clientId,
      managerDocumentId: body.managerDocumentId,
      accessCodeDocumentId: body.accessCodeDocumentId,
    });
    void invalidateAdminPlatformServerCache();
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Seat downgrade failed");
  }
}
