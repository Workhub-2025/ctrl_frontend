import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import {
  createFirebaseBillingApi,
} from "@/lib/firebase-billing-api";
import {
  DEFAULT_PLATFORM_ASSESSMENTS,
  PREMIUM_PLATFORM_ASSESSMENTS,
  resolveAssessmentCatalogueTitle,
} from "@/lib/client/entitlements";
import { requireFirebaseTenancySession } from "@/lib/firebase-tenancy-bff";
import {
  PORTAL_USER_SCOPED_TTL_MS,
  portalClientEntitlementsCacheKey,
} from "@/lib/portal-cache-keys";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";
import type { BackendClientEntitlements } from "@/services/client-upgrade.service";
import { rejectRateLimitedPortalRead } from "@/lib/security/api-rate-limit";

async function loadFirebaseClientEntitlements(input: {
  organizationId: string;
  tenancy: Awaited<ReturnType<typeof requireFirebaseTenancySession>>["tenancy"];
  domainApi: Awaited<ReturnType<typeof requireFirebaseTenancySession>>["domainApi"];
  firebaseSessionCookie: string;
}): Promise<BackendClientEntitlements> {
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

  const commerciallyOperational = billing.commercial?.operational === true;
  const contractActive = commerciallyOperational;
  const lockState = billing.lockState ?? {
    operational: !commerciallyOperational,
    reason: billing.commercial?.reason ?? null,
    userMessage: commerciallyOperational
      ? ""
      : "Your organisation contract is not active. Renew to restore access.",
  };

  return {
    client: {
      documentId: billing.client.documentId || organizationId,
      billingStatus: billing.client.billingStatus,
      autoRenew: billing.client.autoRenew,
    },
    contractActive,
    contract: {
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
    },
    dataRetention: {
      platformDefaultMonths: 12,
      effectiveMonths: 12,
      contractConfiguredMonths: null,
    },
    platformFeatures: {
      deliveryRemote: billing.features.deliveryRemote,
      deliveryHybrid: billing.features.deliveryHybrid,
      assessmentRecovery: billing.features.assessmentRecovery,
    },
    deliveryFeatures: {
      deliveryRemote: billing.features.deliveryRemote,
      deliveryHybrid: billing.features.deliveryHybrid,
    },
    defaultAssessments: DEFAULT_PLATFORM_ASSESSMENTS.map((assessment) => ({
      slug: assessment.key,
      title: assessment.title,
      maxVersion: "1.0.0",
      includedByDefault: true,
      entitlementTier: "core" as const,
      availableVersions: [],
    })),
    additionalAssessments,
    requestableAssessments,
    canRequestUpgrades: commerciallyOperational,
    lockState,
  };
}

export async function GET(request: Request) {
  try {
    const { context, tenancy, domainApi, firebaseSessionCookie } =
      await requireFirebaseTenancySession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }

    const rateLimited = await rejectRateLimitedPortalRead(request, {
      scope: "client-entitlements",
      actorId: context.firebaseUid,
      organizationId: context.organizationId,
    });
    if (rateLimited) return rateLimited;

    const data = await portalServerCacheGetOrSet(
      portalClientEntitlementsCacheKey(context.firebaseUid),
      PORTAL_USER_SCOPED_TTL_MS,
      () =>
        loadFirebaseClientEntitlements({
          organizationId: context.organizationId!,
          tenancy,
          domainApi,
          firebaseSessionCookie,
        }),
    );

    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Entitlements could not be loaded");
  }
}
