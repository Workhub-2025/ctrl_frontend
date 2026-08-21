import { NextRequest, NextResponse } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

type RouteContext = { params: Promise<{ userDocumentId: string }> };

/**
 * Completes a pending privacy erasure request.
 * Path param is the privacy request id (surfaced as `documentId` in the queue).
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const auth = await requireAdminDualAccess("privacy.write");
    if ("error" in auth) return auth.error;

    const { userDocumentId: requestId } = await context.params;
    if (!requestId || requestId.length > 128) {
      return NextResponse.json({ error: "Invalid erasure request id" }, { status: 400 });
    }

    const data = await auth.domainApi.request<unknown>({
      path: `/v1/privacy/admin/erasure-requests/${encodeURIComponent(requestId)}/complete`,
      method: "POST",
      firebaseSessionCookie: auth.firebaseSessionCookie,
      body: {},
    });
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Erasure could not be completed");
  }
}
