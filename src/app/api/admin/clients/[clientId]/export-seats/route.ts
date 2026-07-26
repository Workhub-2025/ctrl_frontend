import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import { exportAdminSeats } from "@/lib/firebase-admin-seat-ops";
import { getAdminClientStrapiUrl } from "@/lib/admin-client-routes";
import { getCmsErrorStatus } from "@/services/admin-platform.service";

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

    if (isFirebaseAdminAuth(auth)) {
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
    }

    const res = await fetch(
      getAdminClientStrapiUrl(clientId, "export-seats"),
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
        ?? "Seat export could not be sent";
      return NextResponse.json({ error: message }, { status: res.status });
    }

    return NextResponse.json(payload);
  } catch (error) {
    const upstreamStatus = getCmsErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seat export could not be sent" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 },
    );
  }
}
