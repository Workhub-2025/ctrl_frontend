import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import { createFirebaseBillingApi } from "@/lib/firebase-billing-api";
import { cmsRequest } from "@/legacy-cms/request";

export async function GET(request: Request) {
  const auth = await requireAdminDualAccess("billing.read");
  if ("error" in auth) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const withinDays = Number(searchParams.get("withinDays") ?? 90);

  try {
    if (isFirebaseAdminAuth(auth)) {
      const billing = createFirebaseBillingApi(
        auth.domainApi,
        auth.firebaseSessionCookie,
      );
      const data = await billing.listExpiringContracts(withinDays);
      return NextResponse.json({ data: data ?? [] });
    }

    const response = await cmsRequest<{ data?: unknown[] }>(
      `/admin/billing/expiring-contracts?withinDays=${encodeURIComponent(String(withinDays))}`,
    );
    return NextResponse.json({ data: response.data ?? [] });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Expiring contracts could not be loaded",
      },
      { status: 500 },
    );
  }
}
