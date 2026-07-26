import { NextResponse } from "next/server";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";

export async function GET() {
  try {
    const auth = await requireFirebaseSession("admin");
    const data = await auth.domainApi.request<unknown[]>({
      path: "/v1/privacy/admin/erasure-requests",
      firebaseSessionCookie: auth.firebaseSessionCookie,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Erasure queue could not be loaded");
  }
}
