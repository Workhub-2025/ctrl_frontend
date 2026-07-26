import { NextResponse } from "next/server";
import { cmsRequest } from "@/legacy-cms/request";
import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import {
  createFirebaseBillingApi,
  platformPricingFromFirebasePrices,
  tryRequireFirebaseBillingSession,
} from "@/lib/firebase-billing-api";

export async function GET() {
  try {
    const firebaseAuth = await tryRequireFirebaseBillingSession();
    if (firebaseAuth) {
      const billing = createFirebaseBillingApi(
        firebaseAuth.domainApi,
        firebaseAuth.firebaseSessionCookie,
      );
      const prices = await billing.listPrices();
      return NextResponse.json({
        data: platformPricingFromFirebasePrices(prices.prices ?? []),
      });
    }

    await requireClientSession();
    const response = await cmsRequest<{ data?: Record<string, unknown> }>("/platform-pricing");
    return NextResponse.json({ data: response.data ?? {} });
  } catch (error) {
    return handleBffRouteError(error, "Pricing could not be loaded");
  }
}
