import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { buildStripeSubscriptionCheckoutData } from "@/lib/stripe/subscription-checkout";
import { getStripeClient, isStripeCheckoutConfigured } from "@/lib/stripe/server";
import {
  buildUpgradeRequestDescription,
  buildUpgradeRequestSubject,
  type ClientUpgradeRequestPayload,
} from "@/lib/client/entitlements";
import {
  normalizeContractTierForLock,
  resolveEffectiveAnnualPlatformPence,
} from "@/lib/billing/contract-pricing-lock";
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
    paymentStatus?: string;
    tier?: string;
    lockedAnnualPlatformPence?: number | null;
    pricingLockedUntil?: string | null;
  }>;
};

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

function getPendingContract(client: AdminClientRecord) {
  return (client.contracts ?? []).find(
    (contract) => contract.status === "active" && contract.paymentStatus === "pending"
  );
}

function resolveAnnualContractPrice(
  contract: NonNullable<AdminClientRecord["contracts"]>[number],
  pricing: Record<string, unknown>
) {
  const asOfDate = new Date().toISOString().split("T")[0];
  const effective = resolveEffectiveAnnualPlatformPence(contract, pricing, asOfDate);
  if (effective && effective > 0) {
    return effective;
  }

  const tier = normalizeContractTierForLock(contract.tier);
  const contractTypePrices =
    pricing.contractTypePrices && typeof pricing.contractTypePrices === "object"
      ? (pricing.contractTypePrices as Record<string, { basePlatformYearlyPence?: number }>)
      : {};
  return Number(
    contractTypePrices[tier]?.basePlatformYearlyPence ??
      pricing.basePlatformYearlyPence ??
      pricing.basePlatformMonthlyPence ??
      0
  );
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const auth = await requireAdminApiAccess('billing.write');
  if ("error" in auth) {
    return auth.error;
  }
  const strapiJwt = auth.strapiJwt;

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

    const contract = getPendingContract(client);
    if (!contract?.documentId) {
      return NextResponse.json(
        { error: "No pending contract found for this client" },
        { status: 400 }
      );
    }

    const pricingResponse = await strapiRequest<{ data?: Record<string, unknown> }>(
      "/platform-pricing"
    );
    const pricing = pricingResponse.data ?? {};
    const amountPence = resolveAnnualContractPrice(contract, pricing);

    if (amountPence <= 0) {
      return NextResponse.json(
        { error: "Annual platform price is not configured. Set it in Admin → Billing → Pricing." },
        { status: 400 }
      );
    }

    const clientDocumentId = client.documentId ?? client.id ?? clientId;
    const clientName = client.name ?? "Client";

    const payload: ClientUpgradeRequestPayload = {
      type: "contract_activation",
      contractDocumentId: contract.documentId,
      clientDocumentId,
      clientName,
      seatCount: contract.seatCount ?? 1,
    };

    const subject = buildUpgradeRequestSubject(payload);
    const description = buildUpgradeRequestDescription(payload, clientName);

    const billingResponse = await strapiRequest<{ data?: { documentId?: string; id?: string } }>(
      "/admin/billing/requests",
      {
        method: "POST",
        body: JSON.stringify({
          clientDocumentId,
          clientName,
          requestKind: "contract_activation",
          upgradeType: "contract_activation",
          subject,
          description,
          payload,
        }),
      }
    );

    const billingRequest = billingResponse.data;
    const billingRequestDocumentId = billingRequest?.documentId ?? billingRequest?.id;
    if (!billingRequestDocumentId) {
      return NextResponse.json(
        { error: "Activation billing request could not be created" },
        { status: 500 }
      );
    }

    const currency = String(pricing.currency ?? "gbp");
    const stripe = getStripeClient();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      subscription_data: buildStripeSubscriptionCheckoutData(),
      success_url: `${getAppUrl()}/client-dashboard/upgrade-requests/?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}/client-dashboard/upgrade-requests/?cancelled=1`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: Math.round(amountPence / 12),
            recurring: {
              interval: "month",
            },
            product_data: {
              name: subject,
              description: `Initial platform contract · ${contract.seatCount ?? 1} hiring manager seats · 1 year from payment (paid monthly)`,
            },
          },
        },
      ],
      metadata: {
        requestKind: "contract_activation",
        billingRequestDocumentId: String(billingRequestDocumentId),
        clientDocumentId,
        upgradeType: "contract_activation",
      },
    });

    await strapiRequest(
      `/admin/billing/requests/${encodeURIComponent(String(billingRequestDocumentId))}/invoice-sent`,
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
        billingRequestDocumentId,
        checkoutSessionId: checkoutSession.id,
        checkoutUrl: checkoutSession.url,
        amountDuePence: amountPence,
        currency,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Activation invoice could not be created" },
      { status: 500 }
    );
  }
}
