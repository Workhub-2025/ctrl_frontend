import { NextResponse } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import {
  createFirebaseBillingApi,
  platformPricingFromFirebasePrices,
} from "@/lib/firebase-billing-api";

export async function GET() {
  const auth = await requireAdminDualAccess("billing.read");
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const billing = createFirebaseBillingApi(
      auth.domainApi,
      auth.firebaseSessionCookie,
    );
    const listed = await billing.listPrices();
    return NextResponse.json({
      data: platformPricingFromFirebasePrices(listed.prices ?? []),
    });
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

export async function PUT() {
  const auth = await requireAdminDualAccess("billing.write");
  if ("error" in auth) {
    return auth.error;
  }

  return NextResponse.json(
    {
      error:
        "Catalogue prices are published by the SQL seeder, not this page. Active contracts keep their locked rate.",
    },
    { status: 501 },
  );
}
