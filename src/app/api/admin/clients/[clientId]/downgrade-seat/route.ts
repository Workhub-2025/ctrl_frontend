import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import { downgradeAdminSeat } from "@/lib/firebase-admin-seat-ops";
import { invalidateAdminPlatformServerCache } from "@/lib/portal-cache-invalidation";
import { getAdminClientStrapiUrl } from "@/lib/admin-client-routes";
import { getCmsErrorStatus } from "@/services/admin-platform.service";

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

    if (isFirebaseAdminAuth(auth)) {
      const data = await downgradeAdminSeat({
        domainApi: auth.domainApi,
        firebaseSessionCookie: auth.firebaseSessionCookie,
        organizationId: clientId,
        managerDocumentId: body.managerDocumentId,
        accessCodeDocumentId: body.accessCodeDocumentId,
      });
      void invalidateAdminPlatformServerCache();
      return NextResponse.json({ data });
    }

    const res = await fetch(getAdminClientStrapiUrl(clientId, "downgrade-seat"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.cmsJwt}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errJson;
      try {
        errJson = JSON.parse(errText);
      } catch {}
      throw new Error(errJson?.error?.message || errJson?.message || errText || "Failed to downgrade seat in backend");
    }

    const data = await res.json();
    void invalidateAdminPlatformServerCache();
    return NextResponse.json(data);
  } catch (error) {
    const upstreamStatus = getCmsErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seat downgrade failed" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}
