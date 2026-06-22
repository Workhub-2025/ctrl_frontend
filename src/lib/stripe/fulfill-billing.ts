import "server-only";

import type Stripe from "stripe";
import { getStrapiApiBaseUrl, joinStrapiApiPath } from "@/lib/strapi-server";
import {
  parseBillingCheckoutMetadata,
  type BillingCheckoutMetadata,
} from "@/lib/stripe/billing-checkout-metadata";

export type { BillingCheckoutMetadata };
export { parseBillingCheckoutMetadata };

function extractStrapiErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const record = body as { error?: string | { message?: string } };
  if (typeof record.error === "string") return record.error;
  if (record.error && typeof record.error === "object" && typeof record.error.message === "string") {
    return record.error.message;
  }
  return undefined;
}

export type FulfillBillingResult = {
  alreadyPaid?: boolean;
  billingRequest?: unknown;
};

export async function fulfillBillingRequest(input: {
  clientDocumentId: string;
  billingRequestDocumentId: string;
  stripeCheckoutSessionId: string;
  stripeInvoiceId?: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}): Promise<FulfillBillingResult> {
  const secret = process.env.BILLING_INTERNAL_SECRET;
  if (!secret) {
    throw new Error("BILLING_INTERNAL_SECRET is not configured");
  }

  const response = await fetch(joinStrapiApiPath(getStrapiApiBaseUrl(), "/internal/billing/fulfill"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-billing-secret": secret,
    },
    body: JSON.stringify(input),
  });

  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(extractStrapiErrorMessage(responseBody) ?? "Fulfillment failed");
  }

  const data =
    responseBody && typeof responseBody === "object" && "data" in responseBody
      ? (responseBody as { data?: FulfillBillingResult }).data
      : undefined;

  return data ?? {};
}

export async function syncStripeSubscription(
  subscription: Stripe.Subscription,
  stripeEventId?: string
): Promise<{ success: boolean; deduplicated?: boolean; clientDocumentId?: string; contractDocumentId?: string }> {
  const secret = process.env.BILLING_INTERNAL_SECRET;
  if (!secret) {
    throw new Error("BILLING_INTERNAL_SECRET is not configured");
  }

  const response = await fetch(joinStrapiApiPath(getStrapiApiBaseUrl(), "/internal/billing/sync-subscription"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-billing-secret": secret,
    },
    body: JSON.stringify({
      subscription,
      ...(stripeEventId ? { stripeEventId } : {}),
    }),
  });

  const responseBody = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(extractStrapiErrorMessage(responseBody) ?? "Subscription sync failed");
  }

  return responseBody;
}

// Keep Stripe import referenced for re-export consumers that typed against this module.
export type StripeCheckoutSession = Stripe.Checkout.Session;
