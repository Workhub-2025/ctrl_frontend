import { NextResponse } from "next/server";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import {
  createFirebaseBillingApi,
  platformPricingFromFirebasePrices,
  requireFirebaseBillingSession,
} from "@/lib/firebase-billing-api";

export async function GET() {
  try {
    const firebaseAuth = await requireFirebaseBillingSession();
    const billing = createFirebaseBillingApi(
      firebaseAuth.domainApi,
      firebaseAuth.firebaseSessionCookie,
    );
    const prices = await billing.listPrices();
    return NextResponse.json({
      data: platformPricingFromFirebasePrices(prices.prices ?? []),
    });
  } catch (error) {
    return handleBffRouteError(error, "Pricing could not be loaded");
  }
}
