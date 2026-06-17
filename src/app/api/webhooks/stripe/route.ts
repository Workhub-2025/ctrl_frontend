import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripeClient } from "@/lib/stripe/server";
import {
  fulfillBillingRequest,
  parseBillingCheckoutMetadata,
} from "@/lib/stripe/fulfill-billing";

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
  const metadata = parseBillingCheckoutMetadata(session);
  if (!metadata) {
    return NextResponse.json({ received: true });
  }

  try {
    const fulfillment = await fulfillBillingRequest({
      clientDocumentId: metadata.clientDocumentId,
      billingRequestDocumentId: metadata.billingRequestDocumentId,
      stripeCheckoutSessionId: session.id,
      stripeInvoiceId: typeof session.invoice === "string" ? session.invoice : undefined,
    });

    return NextResponse.json({
      received: true,
      alreadyPaid: fulfillment.alreadyPaid === true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fulfillment failed" },
      { status: 500 }
    );
  }
}
