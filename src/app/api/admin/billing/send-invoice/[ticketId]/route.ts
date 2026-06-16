import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { isAdminRole } from "@/lib/auth/role-model";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe/server";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";
import type { ClientUpgradeRequestPayload } from "@/lib/client/entitlements";

type SupportTicket = {
  documentId?: string;
  id?: string;
  subject?: string;
  metadata?: {
    requestKind?: string;
    upgradeType?: string;
    clientDocumentId?: string;
    clientName?: string;
    payload?: ClientUpgradeRequestPayload;
  } | null;
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
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured on this environment" }, { status: 503 });
  }

  const { ticketId } = await params;

  try {
    const ticketResponse = await strapiRequest<{ data?: SupportTicket }>(
      `/support-tickets/${encodeURIComponent(ticketId)}`
    );
    const ticket = ticketResponse.data;
    const metadata = ticket?.metadata;
    if (!ticket || !metadata?.payload) {
      return NextResponse.json({ error: "Billing ticket not found" }, { status: 404 });
    }

    const requestKind = metadata.requestKind;
    if (requestKind !== "client_upgrade" && requestKind !== "contract_renewal") {
      return NextResponse.json({ error: "Billing ticket not found" }, { status: 404 });
    }

    const pricingResponse = await strapiRequest<{ data?: Record<string, number | string> }>(
      "/platform-pricing"
    );
    const pricing = pricingResponse.data ?? {};
    const payload = metadata.payload as ClientUpgradeRequestPayload;

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
              name: ticket.subject ?? "CTRL platform upgrade",
              description: metadata.upgradeType?.replace(/_/g, " ") ?? "Upgrade request",
            },
          },
        },
      ],
      metadata: {
        requestKind: requestKind ?? "client_upgrade",
        ticketDocumentId: ticket.documentId ?? ticket.id ?? ticketId,
        clientDocumentId: metadata.clientDocumentId ?? "",
        upgradeType: metadata.upgradeType ?? "",
        payload: JSON.stringify(payload),
      },
    });

    await strapiRequest(
      `/admin/billing/tickets/${encodeURIComponent(ticket.documentId ?? ticketId)}/invoice-sent`,
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
        checkoutSessionId: checkoutSession.id,
        checkoutUrl: checkoutSession.url,
        amountDuePence: amountPence,
        currency,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invoice could not be created" },
      { status: 500 }
    );
  }
}
