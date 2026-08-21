import { NextResponse } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import { createFirebaseBillingApi } from "@/lib/firebase-billing-api";
import { invalidateAdminPlatformServerCache } from "@/lib/portal-cache-invalidation";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ billingRequestId: string }> },
) {
  const auth = await requireAdminDualAccess("billing.write");
  if ("error" in auth) {
    return auth.error;
  }

  const { billingRequestId } = await params;

  try {
    const billing = createFirebaseBillingApi(
      auth.domainApi,
      auth.firebaseSessionCookie,
    );
    const data = await billing.resendAdminCheckout(billingRequestId);
    void invalidateAdminPlatformServerCache();
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invoice link could not be resent",
      },
      { status: 500 },
    );
  }
}
