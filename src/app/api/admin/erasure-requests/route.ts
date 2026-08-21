import { NextResponse } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";

export async function GET() {
  try {
    const auth = await requireAdminDualAccess("privacy.read");
    if ("error" in auth) return auth.error;
    const data = await auth.domainApi.request<unknown[]>({
      path: "/v1/privacy/admin/erasure-requests",
      firebaseSessionCookie: auth.firebaseSessionCookie,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Erasure queue could not be loaded");
  }
}
