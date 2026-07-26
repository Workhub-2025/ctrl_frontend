import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

export async function POST(request: NextRequest) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;
    const auth = await requireFirebaseSession("admin");
    const payload = await request.json().catch(() => ({}));
    const data = await auth.domainApi.request<unknown>({
      path: "/v1/assessment-runtime/admin/attempts/force-abandon",
      method: "POST",
      firebaseSessionCookie: auth.firebaseSessionCookie,
      body: payload,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Force abandon failed");
  }
}
