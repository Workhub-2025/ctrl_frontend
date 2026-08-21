import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { createFirebaseBillingApi } from "@/lib/firebase-billing-api";
import { requireFirebaseTenancySession } from "@/lib/firebase-tenancy-bff";
import { invalidateFirebaseClientPortalCaches } from "@/lib/portal-cache-invalidation";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

export async function POST(request: Request) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const body = await request.json().catch(() => ({}));
    const autoRenew = body.autoRenew === true;

    const { context, domainApi, firebaseSessionCookie } =
      await requireFirebaseTenancySession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }
    const result = await createFirebaseBillingApi(
      domainApi,
      firebaseSessionCookie,
    ).setAutoRenew(autoRenew);
    void invalidateFirebaseClientPortalCaches({
      firebaseUid: context.firebaseUid,
      organizationId: context.organizationId,
    });
    return NextResponse.json({
      data: {
        documentId: result.organizationId,
        autoRenew: result.autoRenew,
      },
    });
  } catch (error) {
    return handleBffRouteError(error, "Auto-renew could not be updated");
  }
}
