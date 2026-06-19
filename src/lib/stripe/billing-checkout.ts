import "server-only";

import type Stripe from "stripe";
import type {
  ClientUpgradeBundleLineItem,
  ClientUpgradeRequestPayload,
} from "@/lib/client/entitlements";
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

function sumLineItems(lineItems: ClientUpgradeBundleLineItem[]) {
  return lineItems.reduce((total, item) => total + item.quantity * item.unitAmountPence, 0);
}

function computeBundleLineItemsFromPricing(
  payload: Extract<ClientUpgradeRequestPayload, { type: "upgrade_bundle" }>,
  pricing: Record<string, number | string>
): ClientUpgradeBundleLineItem[] {
  if (Array.isArray(payload.lineItems) && payload.lineItems.length > 0) {
    return payload.lineItems;
  }

  const seatPrice = Number(pricing.seatOneOffPence ?? pricing.seatMonthlyPence ?? 0);
  const addonPrice = Number(pricing.assessmentAddonPence ?? 0);
  const versionPrice = Number(pricing.versionUpgradePence ?? 0);
  const featurePrices =
    pricing.featurePrices && typeof pricing.featurePrices === "object"
      ? (pricing.featurePrices as Record<string, number>)
      : {};

  const lineItems: ClientUpgradeBundleLineItem[] = [];

  for (const item of payload.items) {
    switch (item.type) {
      case "seat_increase": {
        const additional = Math.max(0, item.requestedSeats - item.currentSeats);
        if (additional > 0) {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth();
          const totalDays = new Date(year, month + 1, 0).getDate();
          const remainingDays = totalDays - now.getDate() + 1;
          const unitAmountPence = Math.round((seatPrice / totalDays) * remainingDays);
          lineItems.push({
            label: `${additional} additional HM seat${additional === 1 ? "" : "s"} (pro-rated for ${remainingDays}/${totalDays} days)`,
            quantity: additional,
            unitAmountPence,
          });
        }
        break;
      }
      case "delivery_feature":
        lineItems.push({
          label: item.featureKey === "deliveryRemote" ? "Remote delivery" : "Hybrid delivery",
          quantity: 1,
          unitAmountPence: featurePrices[item.featureKey] ?? 0,
        });
        break;
      case "new_assessment":
        lineItems.push({
          label: `Add-on assessment: ${item.assessmentLabel}`,
          quantity: 1,
          unitAmountPence: addonPrice,
        });
        break;
      case "assessment_version":
        lineItems.push({
          label: `${item.assessmentLabel} version upgrade (up to v${item.requestedVersion})`,
          quantity: 1,
          unitAmountPence: versionPrice,
        });
        break;
      default:
        break;
    }
  }

  return lineItems;
}

export function computeUpgradeAmountPence(
  payload: ClientUpgradeRequestPayload,
  pricing: Record<string, number | string>,
  billingRequest?: BillingRequestCheckoutRow
): number {
  if (
    billingRequest &&
    typeof (billingRequest as any).amountDuePence === "number" &&
    (billingRequest as any).amountDuePence > 0
  ) {
    return (billingRequest as any).amountDuePence;
  }

  switch (payload.type) {
    case "upgrade_bundle":
      return sumLineItems(computeBundleLineItemsFromPricing(payload, pricing));
    case "seat_increase":
      return (
        Math.max(0, payload.requestedSeats - payload.currentSeats) *
        Number(pricing.seatOneOffPence ?? pricing.seatMonthlyPence ?? 0)
      );
    case "delivery_feature":
      return Number(
        typeof pricing.featurePrices === "object" && pricing.featurePrices && !Array.isArray(pricing.featurePrices)
          ? (pricing.featurePrices as Record<string, number>)[payload.featureKey] ?? 0
          : 0
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

function buildStripeLineItems(
  billingRequest: BillingRequestCheckoutRow,
  payload: ClientUpgradeRequestPayload,
  pricing: Record<string, number | string>,
  currency: string
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const snapshottedAmount = (billingRequest as any).amountDuePence;
  if (typeof snapshottedAmount === "number" && snapshottedAmount > 0) {
    return [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: snapshottedAmount,
          product_data: {
            name: billingRequest.subject ?? "CTRL platform upgrade",
            description: billingRequest.upgradeType?.replace(/_/g, " ") ?? "Upgrade request",
          },
        },
      },
    ];
  }

  if (payload.type === "upgrade_bundle") {
    const bundleLineItems = computeBundleLineItemsFromPricing(payload, pricing);
    if (bundleLineItems.length === 0) {
      throw new Error("No billable line items found for this upgrade bundle");
    }

    return bundleLineItems.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency,
        unit_amount: item.unitAmountPence,
        product_data: {
          name: item.label,
          description: billingRequest.subject ?? "CTRL platform upgrade",
        },
      },
    }));
  }

  const amountPence = computeUpgradeAmountPence(payload, pricing, billingRequest);
  if (amountPence <= 0) {
    throw new Error("Pricing is not configured for this upgrade type. Set prices in Admin → Billing.");
  }

  return [
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
  ];
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

  const amountPence = computeUpgradeAmountPence(payload, pricing, billingRequest);
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
    line_items: buildStripeLineItems(billingRequest, payload, pricing, currency),
    metadata: {
      requestKind,
      billingRequestDocumentId: requestDocumentId,
      clientDocumentId: billingRequest.clientDocumentId ?? "",
      upgradeType: billingRequest.upgradeType ?? "",
    },
  });

  return { checkoutSession, amountPence, currency, requestDocumentId };
}
