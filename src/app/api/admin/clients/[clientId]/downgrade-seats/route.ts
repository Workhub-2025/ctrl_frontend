import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import { downgradeAdminSeats } from "@/lib/firebase-admin-seat-ops";
import { invalidateAdminPlatformServerCache } from "@/lib/portal-cache-invalidation";
import { getAdminClientStrapiUrl } from "@/lib/admin-client-routes";
import { getCmsErrorStatus } from "@/services/admin-platform.service";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminDualAccess("clients.write");
  if ("error" in auth) return auth.error;

  try {
    const { clientId } = await context.params;
    const body = await request.json().catch(() => ({})) as {
      seatNumbers?: unknown[];
      exportReferenceId?: string;
      newSeatCount?: number;
    };

    if (isFirebaseAdminAuth(auth)) {
      const seatNumbers = Array.isArray(body.seatNumbers)
        ? body.seatNumbers
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value > 0)
        : [];
      const data = await downgradeAdminSeats({
        domainApi: auth.domainApi,
        firebaseSessionCookie: auth.firebaseSessionCookie,
        organizationId: clientId,
        seatNumbers,
        exportReferenceId: String(body.exportReferenceId ?? "").trim(),
        newSeatCount: Number(body.newSeatCount),
      });
      void invalidateAdminPlatformServerCache();
      return NextResponse.json({ data });
    }

    const res = await fetch(
      getAdminClientStrapiUrl(clientId, "downgrade-seats"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.cmsJwt}`,
        },
        body: JSON.stringify(body),
      },
    );

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        (payload as { error?: { message?: string } }).error?.message
        ?? (payload as { error?: string }).error
        ?? "Seat deactivation failed";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    void invalidateAdminPlatformServerCache();

    return NextResponse.json(payload);
  } catch (error) {
    const upstreamStatus = getCmsErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seat deactivation failed" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 },
    );
  }
}
