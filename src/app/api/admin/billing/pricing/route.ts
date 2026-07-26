import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import {
  createFirebaseBillingApi,
  platformPricingFromFirebasePrices,
} from "@/lib/firebase-billing-api";
import { invalidateAdminPlatformServerCache } from "@/lib/portal-cache-invalidation";
import { cmsRequest } from "@/legacy-cms/request";

export async function GET() {
  const auth = await requireAdminDualAccess("billing.read");
  if ("error" in auth) {
    return auth.error;
  }

  try {
    if (isFirebaseAdminAuth(auth)) {
      const billing = createFirebaseBillingApi(
        auth.domainApi,
        auth.firebaseSessionCookie,
      );
      const listed = await billing.listPrices();
      return NextResponse.json({
        data: platformPricingFromFirebasePrices(listed.prices ?? []),
      });
    }

    const response = await cmsRequest<{ data?: Record<string, unknown> }>(
      "/platform-pricing",
    );
    return NextResponse.json({ data: response.data ?? null });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Pricing could not be loaded",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminDualAccess("billing.write");
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const body = await request.json();
    if (isFirebaseAdminAuth(auth)) {
      const billing = createFirebaseBillingApi(
        auth.domainApi,
        auth.firebaseSessionCookie,
      );
      const saved = await billing.savePlatformPricing(
        body && typeof body === "object" ? (body as Record<string, unknown>) : {},
      );
      void invalidateAdminPlatformServerCache();
      return NextResponse.json({ data: saved });
    }

    const response = await cmsRequest<{ data?: Record<string, unknown> }>(
      "/admin/platform-pricing",
      {
        method: "PUT",
        body: JSON.stringify(body),
      },
    );
    void invalidateAdminPlatformServerCache();
    return NextResponse.json({ data: response.data ?? null });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Pricing could not be saved",
      },
      { status: 500 },
    );
  }
}
