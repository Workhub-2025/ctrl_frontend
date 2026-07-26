import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";

export async function GET() {
  try {
    const auth = await requireAdminDualAccess("privacy.read");
    if ("error" in auth) return auth.error;
    if (!isFirebaseAdminAuth(auth)) {
      return NextResponse.json(
        { error: "Erasure queue requires the Firebase admin path" },
        { status: 501 },
      );
    }
    const data = await auth.domainApi.request<unknown[]>({
      path: "/v1/privacy/admin/erasure-requests",
      firebaseSessionCookie: auth.firebaseSessionCookie,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Erasure queue could not be loaded");
  }
}
