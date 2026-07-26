import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

type RouteContext = { params: Promise<{ userDocumentId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const auth = await requireFirebaseSession("admin");
    const { userDocumentId } = await context.params;
    const data = await auth.domainApi.request<unknown>({
      path: `/v1/privacy/admin/erasure-requests/${encodeURIComponent(userDocumentId)}/complete`,
      method: "POST",
      firebaseSessionCookie: auth.firebaseSessionCookie,
      body: {},
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Erasure could not be completed");
  }
}
