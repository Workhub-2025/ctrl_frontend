import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";

const STATUSES = new Set(["open", "accepted", "rejected", "superseded"]);

export async function GET(request: NextRequest) {
  try {
    const auth = await requireFirebaseSession("admin");
    const status = request.nextUrl.searchParams.get("status") ?? "open";
    const query = new URLSearchParams({ status: STATUSES.has(status) ? status : "open" });
    const data = await auth.domainApi.request<unknown[]>({
      path: `/v1/assessment-runtime/admin/evidence-reviews?${query.toString()}`,
      firebaseSessionCookie: auth.firebaseSessionCookie,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Failed to load evidence reviews");
  }
}
