import "server-only";

import type Stripe from "stripe";
import type { ClientUpgradeRequestPayload } from "@/lib/client/entitlements";
import { getStripeClient } from "@/lib/stripe/server";

export type BillingRequestCheckoutRow = {
  documentId?: string;
  id?: string;
  subject?: string;
  clientDocumentId?: string;
  requestKind?: string;
  upgradeType?: string;
  payload?: ClientUpgradeRequestPayload;
};

export function getStripeAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

export function computeUpgradeAmountPence(
  payload: ClientUpgradeRequestPayload,
  pricing: Record<string, number | string>
): number {
  switch (payload.type) {
    case "seat_increase":
      return (
        Math.max(0, payload.requestedSeats - payload.currentSeats) *
        Number(pricing.seatOneOffPence ?? pricing.seatMonthlyPence ?? 0)
      );
    case "new_assessment":
      return Number(pricing.assessmentAddonPence ?? 0);
    case "assessment_version":
      return Number(pricing.versionUpgradePence ?? 0);
    case "contract_extension":
      return Number(pricing.basePlatformYearlyPence ?? pricing.basePlatformMonthlyPence ?? 0);
    default:
      return 0;
  }
}

export async function createBillingCheckoutSession(
  billingRequest: BillingRequestCheckoutRow,
  pricing: Record<string, number | string>
): Promise<{
  checkoutSession: Stripe.Checkout.Session;
  amountPence: number;
  currency: string;
  requestDocumentId: string;
}> {
  const payload = billingRequest.payload;
  if (!payload) {
    throw new Error("Billing request payload is missing");
  }

  const amountPence = computeUpgradeAmountPence(payload, pricing);
  if (amountPence <= 0) {
    throw new Error("Pricing is not configured for this upgrade type. Set prices in Admin → Billing.");
  }

  const currency = String(pricing.currency ?? "gbp");
  const requestDocumentId = String(billingRequest.documentId ?? billingRequest.id ?? "");
  if (!requestDocumentId) {
    throw new Error("Billing request document id is missing");
  }

  const requestKind = billingRequest.requestKind ?? "client_upgrade";
  const stripe = getStripeClient();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: `${getStripeAppUrl()}/client-dashboard/upgrade-requests/?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getStripeAppUrl()}/client-dashboard/upgrade-requests/?cancelled=1`,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: amountPence,
          product_data: {
            name: billingRequest.subject ?? "CTRL platform upgrade",
            description: billingRequest.upgradeType?.replace(/_/g, " ") ?? "Upgrade request",
          },
        },
      },
    ],
    metadata: {
      requestKind,
      billingRequestDocumentId: requestDocumentId,
      clientDocumentId: billingRequest.clientDocumentId ?? "",
      upgradeType: billingRequest.upgradeType ?? "",
    },
  });

  return { checkoutSession, amountPence, currency, requestDocumentId };
}
