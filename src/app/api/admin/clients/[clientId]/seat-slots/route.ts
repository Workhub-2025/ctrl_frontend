import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { loadAdminSeatSlots } from "@/lib/firebase-admin-seat-ops";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdminDualAccess("clients.read");
  if ("error" in auth) return auth.error;

  try {
    const { clientId } = await context.params;
    const { slots } = await loadAdminSeatSlots(
      auth.domainApi,
      auth.firebaseSessionCookie,
      clientId,
    );
    return NextResponse.json({ data: slots });
  } catch (error) {
    return handleBffRouteError(error, "Seat slots could not be loaded");
  }
}
