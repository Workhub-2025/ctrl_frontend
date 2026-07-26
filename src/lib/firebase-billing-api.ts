import "server-only";

import { createFirebaseDomainApi } from "@/lib/firebase-domain-api";
import { BffAuthError } from "@/lib/auth/bff-route-errors";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";

export type FirebaseBillingCheckoutResult = Readonly<{
  checkoutUrl: string;
  stripeCheckoutSessionId: string;
  billingStatus: string;
  amountDuePence: number | null;
  currency: string;
}>;

export type FirebaseBillingConfirmResult = Readonly<{
  billingRequestDocumentId: string;
  billingRequestId: string;
  billingStatus: "paid";
  alreadyPaid: boolean;
}>;

export type FirebaseBillingEntitlements = Readonly<{
  client: {
    documentId: string;
    organizationId: string;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    billingStatus: string;
    autoRenew: boolean;
  };
  features: {
    deliveryRemote: boolean;
    deliveryHybrid: boolean;
    assessmentRecovery: boolean;
    additionalAssessmentSlugs: readonly string[];
  };
  seatCount: number;
  tier: string | null;
  commercial?: {
    operational: boolean;
    reason: string | null;
    activeContractId: string | null;
    contractEndDate: string | null;
    organizationStatus: string | null;
    paymentState: string | null;
  };
  lockState?: {
    operational: boolean;
    reason: string | null;
    userMessage: string;
  };
}>;

export async function tryRequireFirebaseBillingSession() {
  try {
    return await requireFirebaseSession("client", "admin");
  } catch (error) {
    if (error instanceof BffAuthError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export type FirebaseAdminBillingRequestRow = Readonly<{
  documentId: string;
  id: string;
  requestNumber: string;
  clientDocumentId: string;
  clientName: string;
  requestKind: string;
  upgradeType: string;
  subject: string;
  payload: Record<string, unknown> | null;
  billingStatus: string;
  amountDuePence: number | null;
  currency: string;
  stripeCheckoutSessionId: string | null;
  createdAt: string;
}>;

export type FirebasePriceRow = Readonly<{
  priceKey: string;
  priceVersion: string;
  amountPence: number;
  currency: string;
  oneOff?: boolean;
  billingInterval: string;
  metadata: Record<string, string | number | boolean>;
}>;

const PLATFORM_PRICE_KEYS = {
  baseYearly: "platform.base_yearly",
  seatOneOff: "platform.seat_one_off",
  assessmentAddon: "platform.assessment_addon",
  feature: (key: string) => `platform.feature.${key}`,
  contractYearly: (tier: string) => `platform.contract.${tier}.yearly`,
} as const;

export function platformPricingFromFirebasePrices(
  prices: readonly FirebasePriceRow[],
): Record<string, unknown> {
  const byKey = new Map(prices.map((price) => [price.priceKey, price]));
  const base = byKey.get(PLATFORM_PRICE_KEYS.baseYearly);
  const featurePrices: Record<string, number> = {};
  for (const price of prices) {
    if (price.priceKey.startsWith("platform.feature.")) {
      featurePrices[price.priceKey.slice("platform.feature.".length)] =
        price.amountPence;
    }
  }
  const contractTypePrices: Record<string, { basePlatformYearlyPence: number }> =
    {};
  for (const tier of ["essential", "professional", "founder"] as const) {
    const row = byKey.get(PLATFORM_PRICE_KEYS.contractYearly(tier));
    contractTypePrices[tier] = {
      basePlatformYearlyPence: row?.amountPence ?? base?.amountPence ?? 0,
    };
  }
  return {
    currency: base?.currency ?? "gbp",
    basePlatformYearlyPence: base?.amountPence ?? 0,
    seatOneOffPence: byKey.get(PLATFORM_PRICE_KEYS.seatOneOff)?.amountPence ?? 0,
    assessmentAddonPence:
      byKey.get(PLATFORM_PRICE_KEYS.assessmentAddon)?.amountPence ?? 0,
    featurePrices,
    founderOfferExpiresAt:
      typeof base?.metadata.founderOfferExpiresAt === "string"
        ? base.metadata.founderOfferExpiresAt
        : null,
    defaultFounderDiscountPercent: Number(
      base?.metadata.defaultFounderDiscountPercent ?? 33,
    ),
    contractTypePrices,
  };
}

export function createFirebaseBillingApi(
  domainApi = createFirebaseDomainApi(),
  firebaseSessionCookie: string,
) {
  return {
    listPrices() {
      return domainApi.request<{
        prices: FirebasePriceRow[];
      }>({
        path: "/v1/billing/prices",
        firebaseSessionCookie,
      });
    },

    getEntitlements(organizationId?: string) {
      const query = organizationId
        ? `?organizationId=${encodeURIComponent(organizationId)}`
        : "";
      return domainApi.request<FirebaseBillingEntitlements>({
        path: `/v1/billing/entitlements${query}`,
        firebaseSessionCookie,
      });
    },

    openCheckout(billingRequestId: string) {
      return domainApi.request<FirebaseBillingCheckoutResult>({
        path: "/v1/billing/checkout",
        method: "POST",
        firebaseSessionCookie,
        body: { billingRequestId, billingRequestDocumentId: billingRequestId },
      });
    },

    confirmCheckout(stripeCheckoutSessionId: string) {
      return domainApi.request<FirebaseBillingConfirmResult>({
        path: "/v1/billing/confirm",
        method: "POST",
        firebaseSessionCookie,
        body: { stripeCheckoutSessionId },
      });
    },

    openPortal() {
      return domainApi.request<{ url: string }>({
        path: "/v1/billing/portal",
        method: "POST",
        firebaseSessionCookie,
        body: {},
      });
    },

    setAutoRenew(autoRenew: boolean) {
      return domainApi.request<{ organizationId: string; autoRenew: boolean }>({
        path: "/v1/billing/auto-renew",
        method: "POST",
        firebaseSessionCookie,
        body: { autoRenew },
      });
    },

    listClientBillingRequests() {
      return domainApi.request<
        Array<{
          documentId: string;
          id: string;
          requestNumber: string;
          clientDocumentId: string;
          clientName: string;
          requestKind: string;
          upgradeType: string;
          subject: string;
          payload: Record<string, unknown>;
          billingStatus: string;
          amountDuePence: number | null;
          currency: string;
          stripeCheckoutSessionId: string | null;
          createdAt: string;
        }>
      >({
        path: "/v1/billing/requests",
        firebaseSessionCookie,
      });
    },

    createClientBillingRequest(payload: Record<string, unknown>) {
      return domainApi.request<{
        documentId: string;
        id: string;
        requestNumber: string;
        clientDocumentId: string;
        requestKind: string;
        upgradeType: string;
        subject: string;
        payload: Record<string, unknown>;
        billingStatus: string;
        amountDuePence: number | null;
        currency: string;
        stripeCheckoutSessionId: string | null;
        createdAt: string;
        checkoutUrl: string | null;
      }>({
        path: "/v1/billing/requests",
        method: "POST",
        firebaseSessionCookie,
        body: { payload },
      });
    },

    listAdminBillingRequests() {
      return domainApi.request<FirebaseAdminBillingRequestRow[]>({
        path: "/v1/admin/billing/requests",
        firebaseSessionCookie,
      });
    },

    listExpiringContracts(withinDays: number) {
      return domainApi.request<unknown[]>({
        path: `/v1/admin/billing/expiring-contracts?withinDays=${encodeURIComponent(String(withinDays))}`,
        firebaseSessionCookie,
      });
    },

    createAdminCheckout(billingRequestId: string) {
      return domainApi.request<Record<string, unknown>>({
        path: `/v1/admin/billing/requests/${encodeURIComponent(billingRequestId)}/create-checkout`,
        method: "POST",
        firebaseSessionCookie,
        body: {},
      });
    },

    resendAdminCheckout(billingRequestId: string) {
      return domainApi.request<Record<string, unknown>>({
        path: `/v1/admin/billing/requests/${encodeURIComponent(billingRequestId)}/resend-checkout`,
        method: "POST",
        firebaseSessionCookie,
        body: {},
      });
    },

    upsertPriceVersion(input: {
      priceKey: string;
      priceVersion: string;
      amountPence: number;
      billingInterval: "once" | "month" | "year";
      effectiveFrom: string;
      metadata?: Record<string, string | number | boolean>;
    }) {
      return domainApi.request<{ priceId: string; created: boolean }>({
        path: "/v1/admin/billing/prices",
        method: "POST",
        firebaseSessionCookie,
        body: input,
      });
    },

    createAdminBillingRequest(input: {
      organizationId: string;
      subject: string;
      payload: Record<string, unknown>;
      amountDuePence?: number | null;
    }) {
      return domainApi.request<{ id: string; request: Record<string, unknown> }>({
        path: "/v1/admin/billing/requests",
        method: "POST",
        firebaseSessionCookie,
        body: input,
      });
    },

    listOrganizationContracts(organizationId: string) {
      return domainApi.request<
        Array<{
          documentId: string;
          id: string;
          organizationId: string;
          clientDocumentId: string;
          tier: string;
          status: string;
          seatCount: number;
          startDate: string | null;
          endDate: string | null;
          paymentStatus: string;
          lockedAnnualPlatformPence: number | null;
          pricingLockedUntil: string | null;
        }>
      >({
        path: `/v1/admin/billing/organizations/${encodeURIComponent(organizationId)}/contracts`,
        firebaseSessionCookie,
      });
    },

    processSeatDecrease(billingRequestId: string) {
      return domainApi.request<{
        billingRequestDocumentId: string;
        organizationId: string;
        previousSeatCount: number;
        newSeatCount: number;
        removedSeatNumbers: number[];
        alreadyProcessed: boolean;
      }>({
        path: `/v1/admin/billing/requests/${encodeURIComponent(billingRequestId)}/process-seat-decrease`,
        method: "POST",
        firebaseSessionCookie,
        body: {},
      });
    },

    async savePlatformPricing(pricing: Record<string, unknown>) {
      const version = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const effectiveFrom = new Date().toISOString();
      const writes: Array<Promise<unknown>> = [];
      const baseYearly = Number(pricing.basePlatformYearlyPence ?? 0);
      writes.push(
        this.upsertPriceVersion({
          priceKey: PLATFORM_PRICE_KEYS.baseYearly,
          priceVersion: version,
          amountPence: Math.max(0, Math.round(baseYearly)),
          billingInterval: "year",
          effectiveFrom,
          metadata: {
            founderOfferExpiresAt:
              typeof pricing.founderOfferExpiresAt === "string"
                ? pricing.founderOfferExpiresAt
                : "",
            defaultFounderDiscountPercent: Number(
              pricing.defaultFounderDiscountPercent ?? 33,
            ),
          },
        }),
      );
      writes.push(
        this.upsertPriceVersion({
          priceKey: PLATFORM_PRICE_KEYS.seatOneOff,
          priceVersion: version,
          amountPence: Math.max(
            0,
            Math.round(Number(pricing.seatOneOffPence ?? 0)),
          ),
          billingInterval: "once",
          effectiveFrom,
        }),
      );
      writes.push(
        this.upsertPriceVersion({
          priceKey: PLATFORM_PRICE_KEYS.assessmentAddon,
          priceVersion: version,
          amountPence: Math.max(
            0,
            Math.round(Number(pricing.assessmentAddonPence ?? 0)),
          ),
          billingInterval: "month",
          effectiveFrom,
        }),
      );
      const featurePrices =
        pricing.featurePrices && typeof pricing.featurePrices === "object"
          ? (pricing.featurePrices as Record<string, number>)
          : {};
      for (const [featureKey, amount] of Object.entries(featurePrices)) {
        writes.push(
          this.upsertPriceVersion({
            priceKey: PLATFORM_PRICE_KEYS.feature(featureKey),
            priceVersion: version,
            amountPence: Math.max(0, Math.round(Number(amount) || 0)),
            billingInterval: "once",
            effectiveFrom,
          }),
        );
      }
      const contractTypePrices =
        pricing.contractTypePrices &&
        typeof pricing.contractTypePrices === "object"
          ? (pricing.contractTypePrices as Record<
              string,
              { basePlatformYearlyPence?: number }
            >)
          : {};
      for (const [tier, row] of Object.entries(contractTypePrices)) {
        writes.push(
          this.upsertPriceVersion({
            priceKey: PLATFORM_PRICE_KEYS.contractYearly(tier),
            priceVersion: version,
            amountPence: Math.max(
              0,
              Math.round(Number(row?.basePlatformYearlyPence ?? 0)),
            ),
            billingInterval: "year",
            effectiveFrom,
          }),
        );
      }
      await Promise.all(writes);
      const listed = await this.listPrices();
      return platformPricingFromFirebasePrices(listed.prices ?? []);
    },
  };
}

/**
 * Forwards a verified Stripe event into the private domain API over WIF.
 * Replaces BILLING_INTERNAL_SECRET on the Firebase path.
 */
export async function ingestStripeEventViaFirebase(event: unknown): Promise<{
  received: boolean;
  alreadyProcessed?: boolean;
  alreadyPaid?: boolean;
  deduplicated?: boolean;
  status?: string;
}> {
  const domainApi = createFirebaseDomainApi();
  return domainApi.request({
    path: "/v1/internal/billing/stripe-events",
    method: "POST",
    body: { event },
  });
}
