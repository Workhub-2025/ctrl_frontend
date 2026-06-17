import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { isAdminRole } from "@/lib/auth/role-model";
import {
  createBillingCheckoutSession,
  type BillingRequestCheckoutRow,
} from "@/lib/stripe/billing-checkout";
import { isStripeCheckoutConfigured } from "@/lib/stripe/server";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

type BillingRequestRow = BillingRequestCheckoutRow & {
  billingStatus?: string;
};

const RESENDABLE_STATUSES = new Set(["invoice_sent", "failed"]);

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = await getServerSession(authOptions);
  const strapiJwt = await getServerStrapiJwt();
  if (!session?.user?.id || !strapiJwt) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  }
  if (!isStripeCheckoutConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe checkout is not configured. Set STRIPE_SECRET_KEY in FrontEnd/.env.local and restart the dev server.",
      },
      { status: 503 }
    );
  }

  const { ticketId: requestId } = await params;

  try {
    const requestResponse = await strapiRequest<{ data?: BillingRequestRow }>(
      `/admin/billing/requests/${encodeURIComponent(requestId)}`
    );
    const billingRequest = requestResponse.data;

    if (!billingRequest?.payload) {
      return NextResponse.json({ error: "Billing request not found" }, { status: 404 });
    }

    if (billingRequest.billingStatus === "paid") {
      return NextResponse.json({ error: "This request is already paid" }, { status: 400 });
    }

    const billingStatus = billingRequest.billingStatus ?? "requested";
    if (!RESENDABLE_STATUSES.has(billingStatus)) {
      return NextResponse.json(
        { error: "Invoice has not been sent yet. Use Send invoice instead." },
        { status: 400 }
      );
    }

    const pricingResponse = await strapiRequest<{ data?: Record<string, number | string> }>(
      "/platform-pricing"
    );
    const pricing = pricingResponse.data ?? {};

    const { checkoutSession, amountPence, currency, requestDocumentId } =
      await createBillingCheckoutSession(billingRequest, pricing);

    await strapiRequest(
      `/admin/billing/requests/${encodeURIComponent(requestDocumentId)}/invoice-sent`,
      {
        method: "POST",
        body: JSON.stringify({
          stripeCheckoutSessionId: checkoutSession.id,
          amountDuePence: amountPence,
          currency,
          checkoutUrl: checkoutSession.url,
        }),
      }
    );

    return NextResponse.json({
      data: {
        billingRequestDocumentId: requestDocumentId,
        checkoutSessionId: checkoutSession.id,
        checkoutUrl: checkoutSession.url,
        amountDuePence: amountPence,
        currency,
        billingStatus: "invoice_sent",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invoice link could not be resent" },
      { status: 500 }
    );
  }
}
