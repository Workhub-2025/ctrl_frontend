import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import {
  addOneDayToDate,
  normalizeContractTierForLock,
  resolveEffectiveAnnualPlatformPence,
} from "@/lib/billing/contract-pricing-lock";
import {
  addOneYearToDate,
  buildUpgradeRequestDescription,
  buildUpgradeRequestSubject,
  type ClientUpgradeRequestPayload,
} from "@/lib/client/entitlements";
import {
  createFirebaseBillingApi,
  platformPricingFromFirebasePrices,
} from "@/lib/firebase-billing-api";
import { invalidateAdminPlatformServerCache } from "@/lib/portal-cache-invalidation";
import { stripeReturnAppUrl } from "@/lib/public-app-urls";
import { buildStripeSubscriptionCheckoutData } from "@/lib/stripe/subscription-checkout";
import { getStripeClient, isStripeCheckoutConfigured } from "@/lib/stripe/server";
import { cmsRequest } from "@/legacy-cms/request";

type AdminClientRecord = {
  documentId?: string;
  id?: string;
  name?: string;
  contracts?: Array<{
    documentId?: string;
    endDate?: string;
    seatCount?: number;
    status?: string;
    tier?: string;
    lockedAnnualPlatformPence?: number | null;
    pricingLockedUntil?: string | null;
  }>;
};

type FirebaseContractRow = {
  documentId: string;
  id: string;
  tier: string;
  status: string;
  seatCount: number;
  startDate: string | null;
  endDate: string | null;
  paymentStatus: string;
  lockedAnnualPlatformPence: number | null;
  pricingLockedUntil: string | null;
};

function getAppUrl() {
  return stripeReturnAppUrl();
}

function getActiveContract(client: AdminClientRecord) {
  const today = new Date().toISOString().split("T")[0];
  return (client.contracts ?? []).find(
    (contract) => contract.status === "active" && contract.endDate && contract.endDate >= today
  );
}

function getFirebaseActiveContract(contracts: FirebaseContractRow[]) {
  const today = new Date().toISOString().split("T")[0];
  return (
    contracts.find(
      (contract) =>
        contract.status === "active" &&
        contract.paymentStatus === "paid" &&
        contract.endDate &&
        contract.endDate.slice(0, 10) >= today,
    ) ??
    contracts.find(
      (contract) =>
        contract.status === "active" &&
        contract.endDate &&
        contract.endDate.slice(0, 10) >= today,
    ) ??
    null
  );
}

function resolveAnnualContractPrice(
  contract: {
    tier?: string;
    endDate?: string | null;
    lockedAnnualPlatformPence?: number | null;
    pricingLockedUntil?: string | null;
  },
  pricing: Record<string, unknown>
) {
  const renewalStartDate = contract.endDate ? addOneDayToDate(contract.endDate.slice(0, 10)) : undefined;
  const tier = normalizeContractTierForLock(contract.tier);
  const effective = resolveEffectiveAnnualPlatformPence(contract, pricing, renewalStartDate);
  if (effective && effective > 0) {
    return effective;
  }

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
  const auth = await requireAdminDualAccess("billing.write");
  if ("error" in auth) {
    return auth.error;
  }

  const { clientId } = await params;

  try {
    if (isFirebaseAdminAuth(auth)) {
      const billing = createFirebaseBillingApi(
        auth.domainApi,
        auth.firebaseSessionCookie,
      );
      const [org, contracts, prices] = await Promise.all([
        auth.domainApi.request<{ id: string; legalName: string }>({
          path: `/v1/organizations/${encodeURIComponent(clientId)}`,
          firebaseSessionCookie: auth.firebaseSessionCookie,
        }),
        billing.listOrganizationContracts(clientId),
        billing.listPrices(),
      ]);
      const contract = getFirebaseActiveContract(contracts);
      if (!contract?.documentId || !contract.endDate) {
        return NextResponse.json(
          { error: "No active contract found for this client" },
          { status: 400 },
        );
      }

      const pricing = platformPricingFromFirebasePrices(prices.prices ?? []);
      const amountPence = resolveAnnualContractPrice(contract, pricing);
      if (amountPence <= 0) {
        return NextResponse.json(
          {
            error:
              "Annual platform price is not configured. Set it in Admin → Billing → Pricing.",
          },
          { status: 400 },
        );
      }

      const clientName = org.legalName || "Client";
      const currentEndDate = contract.endDate.slice(0, 10);
      const newEndDate = addOneYearToDate(currentEndDate);
      const payload: ClientUpgradeRequestPayload = {
        type: "contract_extension",
        contractDocumentId: contract.documentId,
        clientDocumentId: clientId,
        clientName,
        currentEndDate,
        newEndDate,
        seatCount: contract.seatCount ?? 1,
      };
      const subject = buildUpgradeRequestSubject(payload);
      const created = await billing.createAdminBillingRequest({
        organizationId: clientId,
        subject,
        payload,
        amountDuePence: amountPence,
      });
      const billingRequestDocumentId = created.id;
      if (!billingRequestDocumentId) {
        return NextResponse.json(
          { error: "Renewal billing request could not be created" },
          { status: 500 },
        );
      }

      const checkout = await billing.createAdminCheckout(billingRequestDocumentId);
      void invalidateAdminPlatformServerCache();
      return NextResponse.json({
        data: {
          billingRequestDocumentId,
          checkoutSessionId: checkout.checkoutSessionId ?? checkout.stripeCheckoutSessionId,
          checkoutUrl: checkout.checkoutUrl,
          amountDuePence: checkout.amountDuePence ?? amountPence,
          currency: checkout.currency ?? "gbp",
          newEndDate,
        },
      });
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

    const clientsResponse = await cmsRequest<{ data?: AdminClientRecord[] }>("/admin/clients");
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

    const pricingResponse = await cmsRequest<{ data?: Record<string, unknown> }>(
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

    const billingResponse = await cmsRequest<{ data?: { documentId?: string; id?: string } }>(
      "/admin/billing/requests",
      {
        method: "POST",
        body: JSON.stringify({
          clientDocumentId,
          clientName,
          requestKind: "contract_renewal",
          upgradeType: "contract_extension",
          subject,
          description,
          payload,
        }),
      }
    );

    const billingRequest = billingResponse.data;
    const billingRequestDocumentId = billingRequest?.documentId ?? billingRequest?.id;
    if (!billingRequestDocumentId) {
      return NextResponse.json({ error: "Renewal billing request could not be created" }, { status: 500 });
    }

    const currency = String(pricing.currency ?? "gbp");
    const stripe = getStripeClient();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      subscription_data: buildStripeSubscriptionCheckoutData(),
      success_url: `${getAppUrl()}/client-dashboard/billing/?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}/client-dashboard/billing/?cancelled=1`,
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
              description: `Annual platform renewal · extends contract to ${newEndDate} (paid monthly)`,
            },
          },
        },
      ],
      metadata: {
        requestKind: "contract_renewal",
        billingRequestDocumentId: String(billingRequestDocumentId),
        clientDocumentId,
        upgradeType: "contract_extension",
      },
    });

    await cmsRequest(
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

    void invalidateAdminPlatformServerCache();

    return NextResponse.json({
      data: {
        billingRequestDocumentId,
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
