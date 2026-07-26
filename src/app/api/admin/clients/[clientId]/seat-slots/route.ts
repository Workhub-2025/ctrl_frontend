import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import { loadAdminSeatSlots } from "@/lib/firebase-admin-seat-ops";
import { getAdminClientStrapiUrl } from "@/lib/admin-client-routes";
import { getCmsErrorStatus } from "@/services/admin-platform.service";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdminDualAccess("clients.read");
  if ("error" in auth) return auth.error;

  try {
    const { clientId } = await context.params;

    if (isFirebaseAdminAuth(auth)) {
      const { slots } = await loadAdminSeatSlots(
        auth.domainApi,
        auth.firebaseSessionCookie,
        clientId,
      );
      return NextResponse.json({ data: slots });
    }

    const res = await fetch(getAdminClientStrapiUrl(clientId, "seat-slots"), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.cmsJwt}`,
      },
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message =
        (payload as { error?: { message?: string } }).error?.message
        ?? (payload as { error?: string }).error
        ?? (payload as { message?: string }).message
        ?? "Request failed";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    return NextResponse.json(payload);
  } catch (error) {
    const upstreamStatus = getCmsErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seat slots could not be loaded" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 },
    );
  }
}
