import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { isAdminRole } from "@/lib/auth/role-model";
import { getStripeClient, isStripeCheckoutConfigured } from "@/lib/stripe/server";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";
import type { ClientUpgradeRequestPayload } from "@/lib/client/entitlements";

type BillingRequestRow = {
  documentId?: string;
  id?: string;
  subject?: string;
  clientDocumentId?: string;
  requestKind?: string;
  upgradeType?: string;
  payload?: ClientUpgradeRequestPayload;
  billingStatus?: string;
};

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.jwt) {
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
    const payload = billingRequest?.payload;

    if (!billingRequest || !payload) {
      return NextResponse.json({ error: "Billing request not found" }, { status: 404 });
    }

    if (billingRequest.billingStatus === "paid") {
      return NextResponse.json({ error: "This request is already paid" }, { status: 400 });
    }

    if (billingRequest.billingStatus === "invoice_sent") {
      return NextResponse.json({ error: "Invoice has already been sent for this request" }, { status: 400 });
    }

    const pricingResponse = await strapiRequest<{ data?: Record<string, number | string> }>(
      "/platform-pricing"
    );
    const pricing = pricingResponse.data ?? {};

    let amountPence = 0;
    switch (payload.type) {
      case "seat_increase":
        amountPence =
          Math.max(0, payload.requestedSeats - payload.currentSeats) *
          Number(pricing.seatOneOffPence ?? pricing.seatMonthlyPence ?? 0);
        break;
      case "new_assessment":
        amountPence = Number(pricing.assessmentAddonPence ?? 0);
        break;
      case "assessment_version":
        amountPence = Number(pricing.versionUpgradePence ?? 0);
        break;
      case "contract_extension":
        amountPence = Number(pricing.basePlatformYearlyPence ?? pricing.basePlatformMonthlyPence ?? 0);
        break;
    }

    if (amountPence <= 0) {
      return NextResponse.json(
        { error: "Pricing is not configured for this upgrade type. Set prices in Admin → Billing." },
        { status: 400 }
      );
    }

    const currency = String(pricing.currency ?? "gbp");
    const requestKind = billingRequest.requestKind ?? "client_upgrade";
    const requestDocumentId = billingRequest.documentId ?? billingRequest.id ?? requestId;
    const stripe = getStripeClient();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${getAppUrl()}/client-dashboard/upgrade-requests/?paid=1`,
      cancel_url: `${getAppUrl()}/client-dashboard/upgrade-requests/?cancelled=1`,
      line_items: [
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
      ],
      metadata: {
        requestKind,
        billingRequestDocumentId: requestDocumentId,
        clientDocumentId: billingRequest.clientDocumentId ?? "",
        upgradeType: billingRequest.upgradeType ?? "",
        payload: JSON.stringify(payload),
      },
    });

    await strapiRequest(
      `/admin/billing/requests/${encodeURIComponent(String(requestDocumentId))}/invoice-sent`,
      {
        method: "POST",
        body: JSON.stringify({
          stripeCheckoutSessionId: checkoutSession.id,
          amountDuePence: amountPence,
          currency,
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
      { error: error instanceof Error ? error.message : "Invoice could not be created" },
      { status: 500 }
    );
  }
}
