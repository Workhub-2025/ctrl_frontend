import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { isAdminRole } from "@/lib/auth/role-model";
import { getStripeClient, isStripeCheckoutConfigured } from "@/lib/stripe/server";
import {
  addOneYearToDate,
  buildUpgradeRequestDescription,
  buildUpgradeRequestSubject,
  type ClientUpgradeRequestPayload,
} from "@/lib/client/entitlements";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

type AdminClientRecord = {
  documentId?: string;
  id?: string;
  name?: string;
  contracts?: Array<{
    documentId?: string;
    endDate?: string;
    seatCount?: number;
    status?: string;
  }>;
};

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

function getActiveContract(client: AdminClientRecord) {
  const today = new Date().toISOString().split("T")[0];
  return (client.contracts ?? []).find(
    (contract) => contract.status === "active" && contract.endDate && contract.endDate >= today
  );
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
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

  const { clientId } = await params;

  try {
    const clientsResponse = await strapiRequest<{ data?: AdminClientRecord[] }>("/admin/clients");
    const client = (clientsResponse.data ?? []).find(
      (row) => row.documentId === clientId || row.id === clientId
    );
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const contract = getActiveContract(client);
    if (!contract?.documentId || !contract.endDate) {
      return NextResponse.json({ error: "No active contract found for this client" }, { status: 400 });
    }

    const pricingResponse = await strapiRequest<{ data?: Record<string, number | string> }>(
      "/platform-pricing"
    );
    const pricing = pricingResponse.data ?? {};
    const amountPence = Number(
      pricing.basePlatformYearlyPence ?? pricing.basePlatformMonthlyPence ?? 0
    );

    if (amountPence <= 0) {
      return NextResponse.json(
        { error: "Annual platform price is not configured. Set it in Admin → Billing → Pricing." },
        { status: 400 }
      );
    }

    const clientDocumentId = client.documentId ?? client.id ?? clientId;
    const clientName = client.name ?? "Client";
    const newEndDate = addOneYearToDate(contract.endDate);

    const payload: ClientUpgradeRequestPayload = {
      type: "contract_extension",
      contractDocumentId: contract.documentId,
      clientDocumentId,
      clientName,
      currentEndDate: contract.endDate,
      newEndDate,
      seatCount: contract.seatCount ?? 1,
    };

    const subject = buildUpgradeRequestSubject(payload);
    const description = buildUpgradeRequestDescription(payload, clientName);

    const ticketResponse = await strapiRequest<{ data?: { documentId?: string; id?: string } }>(
      "/support-tickets",
      {
        method: "POST",
        body: JSON.stringify({
          subject,
          description,
          category: "general",
          priority: "normal",
          metadata: {
            requestKind: "contract_renewal",
            upgradeType: "contract_extension",
            clientDocumentId,
            clientName,
            payload,
          },
        }),
      }
    );

    const ticket = ticketResponse.data;
    const ticketDocumentId = ticket?.documentId ?? ticket?.id;
    if (!ticketDocumentId) {
      return NextResponse.json({ error: "Renewal invoice ticket could not be created" }, { status: 500 });
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
              name: subject,
              description: `Annual platform renewal · extends contract to ${newEndDate}`,
            },
          },
        },
      ],
      metadata: {
        requestKind: "contract_renewal",
        ticketDocumentId,
        clientDocumentId,
        upgradeType: "contract_extension",
        payload: JSON.stringify(payload),
      },
    });

    await strapiRequest(
      `/admin/billing/tickets/${encodeURIComponent(ticketDocumentId)}/invoice-sent`,
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
        ticketDocumentId,
        checkoutSessionId: checkoutSession.id,
        checkoutUrl: checkoutSession.url,
        amountDuePence: amountPence,
        currency,
        newEndDate,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Renewal invoice could not be created" },
      { status: 500 }
    );
  }
}
