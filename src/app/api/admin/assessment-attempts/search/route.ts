import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireFirebaseSession("admin");
    const { searchParams } = request.nextUrl;
    const query = searchParams.toString();
    const data = await auth.domainApi.request<unknown[]>({
      path: `/v1/assessment-runtime/admin/attempts${query ? `?${query}` : ""}`,
      firebaseSessionCookie: auth.firebaseSessionCookie,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Search failed");
  }
}
