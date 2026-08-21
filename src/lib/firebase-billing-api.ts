import "server-only";

import { createDomainApi } from "@/lib/domain-api";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";

export type FirebaseBillingCheckoutResult = Readonly<{
  checkoutUrl: string | null;
  stripeCheckoutSessionId: string;
  billingStatus: string;
  amountDuePence: number | null;
  currency: string;
  fulfilled?: boolean;
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
  founderDiscountPercent?: number | null;
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

/** Client/admin billing BFF gate. Firebase session only. */
export async function requireFirebaseBillingSession() {
  return requireFirebaseSession("client", "admin");
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

const DEFAULT_CONTRACT_TIER_META: Record<
  "essential" | "professional" | "founder",
  {
    label: string;
    includedSeatCount: number;
    deliveryRemoteIncluded: boolean;
    deliveryHybridIncluded: boolean;
  }
> = {
  essential: {
    label: "Essential",
    includedSeatCount: 1,
    deliveryRemoteIncluded: false,
    deliveryHybridIncluded: false,
  },
  professional: {
    label: "Professional",
    includedSeatCount: 3,
    deliveryRemoteIncluded: true,
    deliveryHybridIncluded: true,
  },
  founder: {
    label: "Founder",
    includedSeatCount: 3,
    deliveryRemoteIncluded: true,
    deliveryHybridIncluded: true,
  },
};

function readBooleanMeta(
  metadata: Record<string, string | number | boolean> | undefined,
  key: string,
  fallback: boolean,
): boolean {
  const value = metadata?.[key];
  return typeof value === "boolean" ? value : fallback;
}

function newestPriceVersion(): string {
  // Immutable price rows — each save must mint a unique version id.
  return `${new Date().toISOString().replace(/[:.]/g, "-")}-${Math.random()
    .toString(36)
    .slice(2, 8)}`.slice(0, 40);
}

export function platformPricingFromFirebasePrices(
  prices: readonly FirebasePriceRow[],
): Record<string, unknown> {
  // Prefer the newest version per key (domain list already sorts newest-first,
  // but keep the Map overwrite order defensive).
  const byKey = new Map<string, FirebasePriceRow>();
  for (const price of prices) {
    if (!byKey.has(price.priceKey)) {
      byKey.set(price.priceKey, price);
    }
  }
  const base = byKey.get(PLATFORM_PRICE_KEYS.baseYearly);
  const featurePrices: Record<string, number> = {};
  for (const price of byKey.values()) {
    if (price.priceKey.startsWith("platform.feature.")) {
      featurePrices[price.priceKey.slice("platform.feature.".length)] =
        price.amountPence;
    }
  }
  const contractTypePrices: Record<
    string,
    {
      label: string;
      basePlatformYearlyPence: number;
      includedSeatCount: number;
      deliveryRemoteIncluded: boolean;
      deliveryHybridIncluded: boolean;
    }
  > = {};
  for (const tier of ["essential", "professional", "founder"] as const) {
    const defaults = DEFAULT_CONTRACT_TIER_META[tier];
    const row = byKey.get(PLATFORM_PRICE_KEYS.contractYearly(tier));
    const metadata = row?.metadata ?? {};
    contractTypePrices[tier] = {
      label:
        typeof metadata.label === "string" && metadata.label.trim()
          ? metadata.label
          : defaults.label,
      basePlatformYearlyPence: row?.amountPence ?? base?.amountPence ?? 0,
      includedSeatCount: Math.max(
        1,
        Number(metadata.includedSeatCount ?? defaults.includedSeatCount) ||
          defaults.includedSeatCount,
      ),
      deliveryRemoteIncluded: readBooleanMeta(
        metadata,
        "deliveryRemoteIncluded",
        defaults.deliveryRemoteIncluded,
      ),
      deliveryHybridIncluded: readBooleanMeta(
        metadata,
        "deliveryHybridIncluded",
        defaults.deliveryHybridIncluded,
      ),
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
  domainApi = createDomainApi(),
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
      oneOff: boolean;
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
      const version = newestPriceVersion();
      const effectiveFrom = new Date().toISOString();
      const writes: Array<Promise<unknown>> = [];
      const baseYearly = Number(pricing.basePlatformYearlyPence ?? 0);
      writes.push(
        this.upsertPriceVersion({
          priceKey: PLATFORM_PRICE_KEYS.baseYearly,
          priceVersion: version,
          amountPence: Math.max(0, Math.round(baseYearly)),
          oneOff: false,
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
          oneOff: true,
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
          oneOff: true,
          billingInterval: "once",
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
            oneOff: true,
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
              {
                label?: string;
                basePlatformYearlyPence?: number;
                includedSeatCount?: number;
                deliveryRemoteIncluded?: boolean;
                deliveryHybridIncluded?: boolean;
              }
            >)
          : {};
      for (const [tier, row] of Object.entries(contractTypePrices)) {
        const defaults =
          DEFAULT_CONTRACT_TIER_META[
            tier as keyof typeof DEFAULT_CONTRACT_TIER_META
          ] ?? DEFAULT_CONTRACT_TIER_META.professional;
        writes.push(
          this.upsertPriceVersion({
            priceKey: PLATFORM_PRICE_KEYS.contractYearly(tier),
            priceVersion: version,
            amountPence: Math.max(
              0,
              Math.round(Number(row?.basePlatformYearlyPence ?? 0)),
            ),
            oneOff: false,
            billingInterval: "year",
            effectiveFrom,
            metadata: {
              label: String(row?.label ?? defaults.label),
              includedSeatCount: Math.max(
                1,
                Number(row?.includedSeatCount ?? defaults.includedSeatCount) ||
                  defaults.includedSeatCount,
              ),
              deliveryRemoteIncluded:
                typeof row?.deliveryRemoteIncluded === "boolean"
                  ? row.deliveryRemoteIncluded
                  : defaults.deliveryRemoteIncluded,
              deliveryHybridIncluded:
                typeof row?.deliveryHybridIncluded === "boolean"
                  ? row.deliveryHybridIncluded
                  : defaults.deliveryHybridIncluded,
            },
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
  const domainApi = createDomainApi();
  return domainApi.request({
    path: "/v1/internal/billing/stripe-events",
    method: "POST",
    body: { event },
  });
}
