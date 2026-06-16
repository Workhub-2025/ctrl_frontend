import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripeClient } from "@/lib/stripe/server";
import type { ClientUpgradeRequestPayload } from "@/lib/client/entitlements";

function getStrapiBaseUrl() {
  return (
    process.env.STRAPI_API_URL ??
    process.env.NEXT_PUBLIC_STRAPI_API_URL ??
    "http://localhost:1337/api"
  ).replace(/\/+$/, "");
}

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing Stripe webhook configuration" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook signature" },
      { status: 400 }
    );
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  const requestKind = session.metadata?.requestKind;
  if (requestKind !== "client_upgrade" && requestKind !== "contract_renewal") {
    return NextResponse.json({ received: true });
  }

  const metadata = session.metadata;
  if (!metadata) {
    return NextResponse.json({ error: "Missing checkout metadata" }, { status: 400 });
  }

  const clientDocumentId = metadata.clientDocumentId;
  const billingRequestDocumentId =
    metadata.billingRequestDocumentId ?? metadata.ticketDocumentId;
  const payloadRaw = metadata.payload;

  if (!clientDocumentId || !billingRequestDocumentId || !payloadRaw) {
    return NextResponse.json({ error: "Incomplete checkout metadata" }, { status: 400 });
  }

  let payload: ClientUpgradeRequestPayload;
  try {
    payload = JSON.parse(payloadRaw) as ClientUpgradeRequestPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload metadata" }, { status: 400 });
  }

  const secret = process.env.BILLING_INTERNAL_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "BILLING_INTERNAL_SECRET is not configured" }, { status: 500 });
  }

  const response = await fetch(`${getStrapiBaseUrl()}/internal/billing/fulfill`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-billing-secret": secret,
    },
    body: JSON.stringify({
      clientDocumentId,
      billingRequestDocumentId,
      payload,
      stripeCheckoutSessionId: session.id,
      stripeInvoiceId: typeof session.invoice === "string" ? session.invoice : undefined,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    return NextResponse.json(
      { error: (errorBody as { error?: string }).error ?? "Fulfillment failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
