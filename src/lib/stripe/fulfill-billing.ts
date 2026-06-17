import "server-only";

import type Stripe from "stripe";

function getStrapiBaseUrl() {
  return (
    process.env.STRAPI_API_URL ??
    process.env.NEXT_PUBLIC_STRAPI_API_URL ??
    "http://localhost:1337/api"
  ).replace(/\/+$/, "");
}

export type BillingCheckoutMetadata = {
  requestKind: "client_upgrade" | "contract_renewal" | "contract_activation";
  clientDocumentId: string;
  billingRequestDocumentId: string;
};

export function parseBillingCheckoutMetadata(
  session: Stripe.Checkout.Session
): BillingCheckoutMetadata | null {
  const requestKind = session.metadata?.requestKind;
  if (
    requestKind !== "client_upgrade" &&
    requestKind !== "contract_renewal" &&
    requestKind !== "contract_activation"
  ) {
    return null;
  }

  const clientDocumentId = session.metadata?.clientDocumentId;
  const billingRequestDocumentId =
    session.metadata?.billingRequestDocumentId ?? session.metadata?.ticketDocumentId;

  if (!clientDocumentId || !billingRequestDocumentId) {
    return null;
  }

  return {
    requestKind,
    clientDocumentId,
    billingRequestDocumentId,
  };
}

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
}): Promise<FulfillBillingResult> {
  const secret = process.env.BILLING_INTERNAL_SECRET;
  if (!secret) {
    throw new Error("BILLING_INTERNAL_SECRET is not configured");
  }

  const response = await fetch(`${getStrapiBaseUrl()}/internal/billing/fulfill`, {
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
