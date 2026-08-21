import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { exportAdminSeats } from "@/lib/firebase-admin-seat-ops";

type RouteContext = { params: Promise<{ clientId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminDualAccess("clients.write");
  if ("error" in auth) return auth.error;

  try {
    const { clientId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const seatNumbers = Array.isArray((body as { seatNumbers?: unknown }).seatNumbers)
      ? ((body as { seatNumbers: unknown[] }).seatNumbers
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0) as number[])
      : [];

    const sessionUser = auth.session as { user?: { email?: string | null } };
    const data = await exportAdminSeats({
      domainApi: auth.domainApi,
      firebaseSessionCookie: auth.firebaseSessionCookie,
      organizationId: clientId,
      seatNumbers,
      adminEmail:
        typeof sessionUser.user?.email === "string"
          ? sessionUser.user.email
          : null,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Seat export could not be sent");
  }
}
