import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripeClient } from "@/lib/stripe/server";
import {
  fulfillBillingRequest,
  parseBillingCheckoutMetadata,
  syncStripeSubscription,
} from "@/lib/stripe/fulfill-billing";
import type Stripe from "stripe";

const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true, paymentPending: true });
    }
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
        stripeSubscriptionId:
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id,
        stripeCustomerId:
          typeof session.customer === "string" ? session.customer : session.customer?.id,
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
  } else if (SUBSCRIPTION_EVENTS.has(event.type)) {
    const subscription = event.data.object as Stripe.Subscription;
    try {
      const syncResult = await syncStripeSubscription(subscription);
      return NextResponse.json({
        received: true,
        synced: syncResult.success,
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Subscription sync failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
