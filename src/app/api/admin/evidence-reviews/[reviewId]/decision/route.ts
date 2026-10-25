import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;
    const { reviewId } = await params;
    if (!UUID.test(reviewId)) {
      return NextResponse.json({ error: "Invalid review" }, { status: 400 });
    }
    const auth = await requireFirebaseSession("admin");
    const payload = await request.json().catch(() => ({}));
    const data = await auth.domainApi.request<unknown>({
      path: `/v1/assessment-runtime/admin/evidence-reviews/${reviewId}/decision`,
      method: "POST",
      firebaseSessionCookie: auth.firebaseSessionCookie,
      body: payload,
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Evidence decision failed");
  }
}
