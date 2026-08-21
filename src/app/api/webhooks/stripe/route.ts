import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripeClient } from "@/lib/stripe/server";
import type Stripe from "stripe";
import { ingestStripeEventViaFirebase } from "@/lib/firebase-billing-api";
import { invalidateAdminPlatformServerCache } from "@/lib/portal-cache-invalidation";

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing Stripe webhook configuration" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook signature" },
      { status: 400 }
    );
  }

  const domainApiConfigured = Boolean(
    (process.env.DOMAIN_API_URL?.trim() ||
      process.env.FIREBASE_DOMAIN_API_URL?.trim()) &&
      process.env.GOOGLE_WORKLOAD_IDENTITY_PROVIDER?.trim() &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim(),
  );
  if (!domainApiConfigured) {
    return NextResponse.json(
      { error: "Billing domain API is not configured" },
      { status: 503 },
    );
  }

  try {
    const result = await ingestStripeEventViaFirebase(event);
    void invalidateAdminPlatformServerCache();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Billing fulfilment failed" },
      { status: 500 },
    );
  }
}
