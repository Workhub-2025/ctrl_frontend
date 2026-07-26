import "server-only";

import { createFirebaseBillingApi } from "@/lib/firebase-billing-api";
import {
  DEFAULT_PLATFORM_ASSESSMENTS,
  PREMIUM_PLATFORM_ASSESSMENTS,
  resolveAssessmentCatalogueTitle,
} from "@/lib/client/entitlements";
import type { requireFirebaseTenancySession } from "@/lib/firebase-tenancy-bff";
import type { BackendClientEntitlements } from "@/services/client-upgrade.service";

export type LoadClientBillingStateInput = {
  organizationId: string;
  tenancy: Awaited<ReturnType<typeof requireFirebaseTenancySession>>["tenancy"];
  domainApi: Awaited<ReturnType<typeof requireFirebaseTenancySession>>["domainApi"];
  firebaseSessionCookie: string;
};

export async function loadClientBillingState(input: LoadClientBillingStateInput) {
  const { organizationId, tenancy, domainApi, firebaseSessionCookie } = input;

  const [seatEntitlements, billing] = await Promise.all([
    tenancy.listEntitlements(organizationId),
    createFirebaseBillingApi(domainApi, firebaseSessionCookie).getEntitlements(
      organizationId,
    ),
  ]);

  const seats = seatEntitlements.find(
    (entitlement) => entitlement.entitlementKey === "hiring_manager_seats",
  );
  const seatCount = billing.seatCount || seats?.quantity || 0;
  const commerciallyOperational = billing.commercial?.operational === true;
  const contractActive = commerciallyOperational;
  const unlockedPremiumSlugs = new Set(
    billing.features.additionalAssessmentSlugs ?? [],
  );

  const additionalAssessments = [...unlockedPremiumSlugs].map((slug) => ({
    slug,
    title: resolveAssessmentCatalogueTitle(slug),
    maxVersion: "1.0.0",
    summary: null as string | null,
    entitlementTier: "premium" as const,
    availableVersions: [] as Array<{
      version: string;
      title: string;
      description: string | null;
    }>,
  }));

  const requestableAssessments = PREMIUM_PLATFORM_ASSESSMENTS.filter(
    (assessment) => !unlockedPremiumSlugs.has(assessment.key),
  ).map((assessment) => ({
    slug: assessment.key,
    title: assessment.title,
    summary: assessment.description,
    entitlementTier: "premium" as const,
  }));

  const lockState = billing.lockState ?? {
    operational: !commerciallyOperational,
    reason: billing.commercial?.reason ?? null,
    userMessage: commerciallyOperational
      ? ""
      : "Your organisation contract is not active. Renew to restore access.",
  };

  const contract = {
    documentId:
      billing.commercial?.activeContractId ??
      seats?.id ??
      organizationId,
    seatCount,
    startDate: seats?.validFrom,
    endDate:
      billing.commercial?.contractEndDate ??
      seats?.validUntil ??
      undefined,
    status: commerciallyOperational
      ? "active"
      : seats?.status ?? "draft",
    paymentStatus: billing.client.billingStatus,
    paidAt: undefined,
    daysUntilExpiry: undefined,
    tier: billing.tier ?? seats?.source ?? undefined,
    minimumContractedSeats: seats?.quantity ?? seatCount,
    founderDiscountPercent: undefined,
    assessmentDataRetentionMonths: undefined,
    effectiveAssessmentDataRetentionMonths: 12,
    autoRenew: billing.client.autoRenew,
  };

  const client = {
    documentId: billing.client.documentId || organizationId,
    billingStatus: billing.client.billingStatus,
    autoRenew: billing.client.autoRenew,
  };

  const platformFeatures = {
    deliveryRemote: billing.features.deliveryRemote,
    deliveryHybrid: billing.features.deliveryHybrid,
    assessmentRecovery: billing.features.assessmentRecovery,
  };

  const deliveryFeatures = {
    deliveryRemote: billing.features.deliveryRemote,
    deliveryHybrid: billing.features.deliveryHybrid,
  };

  const defaultEntitlementAssessments = DEFAULT_PLATFORM_ASSESSMENTS.map(
    (assessment) => ({
      slug: assessment.key,
      title: assessment.title,
      maxVersion: "1.0.0",
      includedByDefault: true,
      entitlementTier: "core" as const,
      availableVersions: [],
    }),
  );

  const backendEntitlements: BackendClientEntitlements = {
    client,
    contractActive,
    contract,
    dataRetention: {
      platformDefaultMonths: 12,
      effectiveMonths: 12,
      contractConfiguredMonths: null,
    },
    platformFeatures,
    deliveryFeatures,
    defaultAssessments: defaultEntitlementAssessments,
    additionalAssessments,
    requestableAssessments,
    canRequestUpgrades: commerciallyOperational,
    lockState,
  };

  return {
    billing,
    seats,
    seatCount,
    commerciallyOperational,
    contractActive,
    unlockedPremiumSlugs,
    additionalAssessments,
    requestableAssessments,
    lockState,
    contract,
    client,
    platformFeatures,
    deliveryFeatures,
    backendEntitlements,
  };
}

export type ClientBillingState = Awaited<ReturnType<typeof loadClientBillingState>>;
