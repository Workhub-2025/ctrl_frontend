import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import { createFirebaseBillingApi } from "@/lib/firebase-billing-api";
import { invalidateAdminPlatformServerCache } from "@/lib/portal-cache-invalidation";
import { cmsRequest } from "@/legacy-cms/request";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const auth = await requireAdminDualAccess("billing.write");
  if ("error" in auth) {
    return auth.error;
  }

  const { requestId } = await params;

  try {
    if (isFirebaseAdminAuth(auth)) {
      const billing = createFirebaseBillingApi(
        auth.domainApi,
        auth.firebaseSessionCookie,
      );
      const data = await billing.processSeatDecrease(requestId);
      void invalidateAdminPlatformServerCache();
      return NextResponse.json({ data });
    }

    const response = await cmsRequest<{ data?: Record<string, unknown> }>(
      `/admin/billing/requests/${encodeURIComponent(requestId)}/process-seat-decrease`,
      { method: "POST" },
    );

    void invalidateAdminPlatformServerCache();

    return NextResponse.json({ data: response.data ?? null });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Seat reduction could not be processed",
      },
      { status: 500 },
    );
  }
}
