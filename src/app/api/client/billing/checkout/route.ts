import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { normalizeRole } from "@/lib/auth/role-model";
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

  const body = (await request.json().catch(() => ({}))) as { ticketDocumentId?: string };
  if (!body.ticketDocumentId) {
    return NextResponse.json({ error: "ticketDocumentId is required" }, { status: 400 });
  }

  try {
    const ticketResponse = await strapiRequest<{
      data?: { stripeCheckoutSessionId?: string; billingStatus?: string };
    }>(`/support-tickets/${encodeURIComponent(body.ticketDocumentId)}`);

    const ticket = ticketResponse.data;
    if (!ticket?.stripeCheckoutSessionId) {
      return NextResponse.json({ error: "No invoice is available for this request yet" }, { status: 404 });
    }
    if (ticket.billingStatus === "paid") {
      return NextResponse.json({ error: "This upgrade request is already paid" }, { status: 400 });
    }

    const stripe = getStripeClient();
    const checkoutSession = await stripe.checkout.sessions.retrieve(ticket.stripeCheckoutSessionId);
    if (!checkoutSession.url) {
      return NextResponse.json({ error: "Checkout session URL is unavailable" }, { status: 404 });
    }

    return NextResponse.json({
      data: {
        checkoutUrl: checkoutSession.url,
        billingStatus: ticket.billingStatus ?? "invoice_sent",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout could not be opened" },
      { status: 500 }
    );
  }
}
