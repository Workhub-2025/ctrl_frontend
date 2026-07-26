import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import { createFirebaseBillingApi } from "@/lib/firebase-billing-api";
import { invalidateAdminPlatformServerCache } from "@/lib/portal-cache-invalidation";
import { isStripeCheckoutConfigured } from "@/lib/stripe/server";
import { cmsRequest } from "@/legacy-cms/request";

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
    if (isFirebaseAdminAuth(auth)) {
      const billing = createFirebaseBillingApi(
        auth.domainApi,
        auth.firebaseSessionCookie,
      );
      const data = await billing.createAdminCheckout(billingRequestId);
      void invalidateAdminPlatformServerCache();
      return NextResponse.json({ data });
    }

    if (!isStripeCheckoutConfigured()) {
      return NextResponse.json(
        {
          error:
            "Stripe checkout is not configured. Set STRIPE_SECRET_KEY in FrontEnd/.env.local and restart the dev server.",
        },
        { status: 503 },
      );
    }

    const response = await cmsRequest<{ data?: Record<string, unknown> }>(
      `/admin/billing/requests/${encodeURIComponent(billingRequestId)}/create-checkout`,
      { method: "POST" },
    );

    void invalidateAdminPlatformServerCache();

    return NextResponse.json({
      data: response.data,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Invoice could not be created",
      },
      { status: 500 },
    );
  }
}
