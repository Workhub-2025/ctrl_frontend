import { NextResponse } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import {
  normalizeContractTierForLock,
  resolveEffectiveAnnualPlatformPence,
} from "@/lib/billing/contract-pricing-lock";
import {
  buildUpgradeRequestSubject,
  type ClientUpgradeRequestPayload,
} from "@/lib/client/entitlements";
import {
  createFirebaseBillingApi,
  platformPricingFromFirebasePrices,
} from "@/lib/firebase-billing-api";
import { invalidateAdminPlatformServerCache } from "@/lib/portal-cache-invalidation";

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

function getPendingContract(contracts: FirebaseContractRow[]) {
  return (
    contracts.find(
      (contract) =>
        (contract.status === "draft" || contract.status === "pending_payment") &&
        contract.paymentStatus === "unpaid",
    ) ??
    contracts.find(
      (contract) =>
        contract.status === "active" && contract.paymentStatus === "unpaid",
    ) ??
    null
  );
}

function resolveAnnualContractPrice(
  contract: {
    tier?: string;
    lockedAnnualPlatformPence?: number | null;
    pricingLockedUntil?: string | null;
  },
  pricing: Record<string, unknown>,
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
      0,
  );
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ clientId: string }> },
) {
  const auth = await requireAdminDualAccess("billing.write");
  if ("error" in auth) {
    return auth.error;
  }

  const { clientId } = await params;

  try {
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
    const contract = getPendingContract(contracts);
    if (!contract?.documentId) {
      return NextResponse.json(
        { error: "No pending contract found for this client" },
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
    const payload: ClientUpgradeRequestPayload = {
      type: "contract_activation",
      contractDocumentId: contract.documentId,
      clientDocumentId: clientId,
      clientName,
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
        { error: "Activation billing request could not be created" },
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
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Activation invoice could not be created" },
      { status: 500 },
    );
  }
}
