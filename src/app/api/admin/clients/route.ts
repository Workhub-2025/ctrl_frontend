import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import { toAdminOverviewFromScreen } from "@/lib/firebase-admin-tenancy-bff";
import { createFirebaseScreenApi } from "@/lib/firebase-screen-api";
import { getAdminClients } from "@/services/admin-platform.service";

export async function GET() {
  try {
    const auth = await requireAdminDualAccess("clients.read");
    if ("error" in auth) return auth.error;

    if (isFirebaseAdminAuth(auth)) {
      const screens = createFirebaseScreenApi(
        auth.domainApi,
        auth.firebaseSessionCookie,
      );
      const screen = await screens.getAdminOverview();
      const overview = toAdminOverviewFromScreen(screen);
      return NextResponse.json({ data: overview.seatUsage });
    }

    const clients = await getAdminClients(auth.cmsJwt);
    return NextResponse.json({ data: clients });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Clients could not be loaded",
      },
      { status: 500 },
    );
  }
}
