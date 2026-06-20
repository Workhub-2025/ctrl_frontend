import "server-only";

import type Stripe from "stripe";
import type {
  ClientUpgradeBundleLineItem,
  ClientUpgradeRequestPayload,
} from "@/lib/client/entitlements";
import {
  isRecurringUpgradeItemType,
  monthlyAssessmentAddonPence,
  monthlySeatPricePence,
  payloadUsesSubscriptionCheckout,
} from "@/lib/stripe/billing-recurring";
import { buildStripeSubscriptionCheckoutData } from "@/lib/stripe/subscription-checkout";
import { getStripeClient } from "@/lib/stripe/server";

export type BillingRequestCheckoutRow = {
  documentId?: string;
  id?: string;
  subject?: string;
  clientDocumentId?: string;
  requestKind?: string;
  upgradeType?: string;
  payload?: ClientUpgradeRequestPayload;
  amountDuePence?: number;
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

  const seatPrice = monthlySeatPricePence(pricing);
  const addonPrice = monthlyAssessmentAddonPence(pricing);
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
          lineItems.push({
            label: `${additional} additional HM seat${additional === 1 ? "" : "s"}`,
            quantity: additional,
            unitAmountPence: seatPrice,
            billingInterval: "month",
          });
        }
        break;
      }
      case "delivery_feature":
        lineItems.push({
          label: item.featureKey === "deliveryRemote" ? "Remote delivery" : "Hybrid delivery",
          quantity: 1,
          unitAmountPence: featurePrices[item.featureKey] ?? 0,
          billingInterval: "once",
        });
        break;
      case "new_assessment":
        lineItems.push({
          label: `Add-on assessment: ${item.assessmentLabel}`,
          quantity: 1,
          unitAmountPence: addonPrice,
          billingInterval: "month",
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
    typeof billingRequest.amountDuePence === "number" &&
    billingRequest.amountDuePence > 0
  ) {
    return billingRequest.amountDuePence;
  }

  switch (payload.type) {
    case "upgrade_bundle":
      return sumLineItems(computeBundleLineItemsFromPricing(payload, pricing));
    case "seat_increase":
      return (
        Math.max(0, payload.requestedSeats - payload.currentSeats) * monthlySeatPricePence(pricing)
      );
    case "delivery_feature":
      return Number(
        typeof pricing.featurePrices === "object" && pricing.featurePrices && !Array.isArray(pricing.featurePrices)
          ? (pricing.featurePrices as Record<string, number>)[payload.featureKey] ?? 0
          : 0
      );
    case "new_assessment":
      return monthlyAssessmentAddonPence(pricing);
    case "contract_extension":
      return Number(pricing.basePlatformYearlyPence ?? pricing.basePlatformMonthlyPence ?? 0);
    case "contract_activation":
      return Number(pricing.basePlatformYearlyPence ?? pricing.basePlatformMonthlyPence ?? 0);
    default:
      return 0;
  }
}

function mapLineItemToStripe(
  item: ClientUpgradeBundleLineItem,
  currency: string,
  fallbackDescription: string
): Stripe.Checkout.SessionCreateParams.LineItem {
  const isMonthly = item.billingInterval === "month";

  return {
    quantity: item.quantity,
    price_data: {
      currency,
      unit_amount: item.unitAmountPence,
      recurring: isMonthly ? { interval: "month" } : undefined,
      product_data: {
        name: item.label,
        description: isMonthly
          ? `${item.label} · paid monthly via Direct Debit`
          : fallbackDescription,
      },
    },
  };
}

function buildStripeLineItems(
  billingRequest: BillingRequestCheckoutRow,
  payload: ClientUpgradeRequestPayload,
  pricing: Record<string, number | string>,
  currency: string
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const snapshottedAmount = billingRequest.amountDuePence;
  const isContractCheckout =
    payload.type === "contract_activation" || payload.type === "contract_extension";

  if (typeof snapshottedAmount === "number" && snapshottedAmount > 0 && isContractCheckout) {
    return [
      {
        quantity: 1,
        price_data: {
          currency,
          unit_amount: Math.round(snapshottedAmount / 12),
          recurring: { interval: "month" },
          product_data: {
            name: billingRequest.subject ?? "CTRL platform upgrade",
            description: "Annual platform contract · paid monthly via Direct Debit",
          },
        },
      },
    ];
  }

  const fallbackDescription = billingRequest.subject ?? "CTRL platform upgrade";

  if (payload.type === "upgrade_bundle") {
    const bundleLineItems = computeBundleLineItemsFromPricing(payload, pricing);
    if (bundleLineItems.length === 0) {
      throw new Error("No billable line items found for this upgrade bundle");
    }

    return bundleLineItems.map((item) => mapLineItemToStripe(item, currency, fallbackDescription));
  }

  if (payload.type === "seat_increase") {
    const additional = Math.max(0, payload.requestedSeats - payload.currentSeats);
    if (additional <= 0) {
      throw new Error("No additional seats to bill");
    }

    return [
      mapLineItemToStripe(
        {
          label: `${additional} additional HM seat${additional === 1 ? "" : "s"}`,
          quantity: additional,
          unitAmountPence: monthlySeatPricePence(pricing),
          billingInterval: "month",
        },
        currency,
        fallbackDescription
      ),
    ];
  }

  if (payload.type === "new_assessment") {
    return [
      mapLineItemToStripe(
        {
          label: `Add-on assessment: ${payload.assessmentLabel}`,
          quantity: 1,
          unitAmountPence: monthlyAssessmentAddonPence(pricing),
          billingInterval: "month",
        },
        currency,
        fallbackDescription
      ),
    ];
  }

  const amountPence = computeUpgradeAmountPence(payload, pricing, billingRequest);
  if (amountPence <= 0) {
    throw new Error("Pricing is not configured for this upgrade type. Set prices in Admin → Billing.");
  }

  const usesSubscription = payloadUsesSubscriptionCheckout(payload);

  return [
    {
      quantity: 1,
      price_data: {
        currency,
        unit_amount: usesSubscription ? Math.round(amountPence / 12) : amountPence,
        recurring: usesSubscription ? { interval: "month" } : undefined,
        product_data: {
          name: billingRequest.subject ?? "CTRL platform upgrade",
          description: usesSubscription
            ? "Annual platform contract · paid monthly via Direct Debit"
            : (billingRequest.upgradeType?.replace(/_/g, " ") ?? "Upgrade request"),
        },
      },
    },
  ];
}

export async function createBillingCheckoutSession(
  billingRequest: BillingRequestCheckoutRow,
  pricing: Record<string, number | string>,
  options?: { stripeCustomerId?: string | null }
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
  const usesSubscription = payloadUsesSubscriptionCheckout(payload);
  const stripeCustomerId = options?.stripeCustomerId?.trim();
  const stripe = getStripeClient();
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: usesSubscription ? "subscription" : "payment",
    ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
    ...(usesSubscription ? { subscription_data: buildStripeSubscriptionCheckoutData() } : {}),
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

export { isRecurringUpgradeItemType, payloadUsesSubscriptionCheckout };
