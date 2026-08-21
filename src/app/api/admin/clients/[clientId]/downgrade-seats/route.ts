import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { downgradeAdminSeats } from "@/lib/firebase-admin-seat-ops";
import { invalidateAdminPlatformServerCache } from "@/lib/portal-cache-invalidation";

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
  } catch (error) {
    return handleBffRouteError(error, "Seat deactivation failed");
  }
}
