import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { normalizeRole } from "@/lib/auth/role-model";
import {
  fulfillBillingRequest,
  parseBillingCheckoutMetadata,
} from "@/lib/stripe/fulfill-billing";
import { getStripeClient, isStripeCheckoutConfigured } from "@/lib/stripe/server";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.jwt) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (normalizeRole(session.user.role) !== "client") {
    return NextResponse.json({ error: "Client access required" }, { status: 403 });
  }
  if (!isStripeCheckoutConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    stripeCheckoutSessionId?: string;
    sessionId?: string;
  };
  const stripeCheckoutSessionId = body.stripeCheckoutSessionId ?? body.sessionId;
  if (!stripeCheckoutSessionId) {
    return NextResponse.json({ error: "stripeCheckoutSessionId is required" }, { status: 400 });
  }

  try {
    const entitlementsResponse = await strapiRequest<{
      data?: { client?: { documentId?: string } };
    }>("/client/entitlements");
    const clientDocumentId = entitlementsResponse.data?.client?.documentId;
    if (!clientDocumentId) {
      return NextResponse.json({ error: "Client account could not be resolved" }, { status: 403 });
    }

    const stripe = getStripeClient();
    const checkoutSession = await stripe.checkout.sessions.retrieve(stripeCheckoutSessionId);
    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment is not complete yet" }, { status: 400 });
    }

    const metadata = parseBillingCheckoutMetadata(checkoutSession);
    if (!metadata) {
      return NextResponse.json({ error: "Checkout session is not a billing payment" }, { status: 400 });
    }
    if (metadata.clientDocumentId !== clientDocumentId) {
      return NextResponse.json({ error: "Checkout session does not belong to this client" }, { status: 403 });
    }

    await fulfillBillingRequest({
      clientDocumentId: metadata.clientDocumentId,
      billingRequestDocumentId: metadata.billingRequestDocumentId,
      stripeCheckoutSessionId: checkoutSession.id,
      stripeInvoiceId:
        typeof checkoutSession.invoice === "string" ? checkoutSession.invoice : undefined,
    });

    return NextResponse.json({
      data: {
        billingRequestDocumentId: metadata.billingRequestDocumentId,
        billingStatus: "paid",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment could not be confirmed" },
      { status: 500 }
    );
  }
}
