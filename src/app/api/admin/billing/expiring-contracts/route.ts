import { NextResponse } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import { createFirebaseBillingApi } from "@/lib/firebase-billing-api";

export async function GET(request: Request) {
  const auth = await requireAdminDualAccess("billing.read");
  if ("error" in auth) {
    return auth.error;
  }

  const { searchParams } = new URL(request.url);
  const withinDays = Number(searchParams.get("withinDays") ?? 90);

  try {
    const billing = createFirebaseBillingApi(
      auth.domainApi,
      auth.firebaseSessionCookie,
    );
    const data = await billing.listExpiringContracts(withinDays);
    return NextResponse.json({ data: data ?? [] });
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
