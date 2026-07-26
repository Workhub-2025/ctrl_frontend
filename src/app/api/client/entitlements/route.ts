import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import {
  createFirebaseBillingApi,
} from "@/lib/firebase-billing-api";
import {
  DEFAULT_PLATFORM_ASSESSMENTS,
} from "@/lib/client/entitlements";
import { requireFirebaseTenancySession } from "@/lib/firebase-tenancy-bff";

export async function GET() {
  try {
    const { context, tenancy, domainApi, firebaseSessionCookie } =
      await requireFirebaseTenancySession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }

    const [seatEntitlements, billing] = await Promise.all([
      tenancy.listEntitlements(context.organizationId),
      createFirebaseBillingApi(domainApi, firebaseSessionCookie).getEntitlements(
        context.organizationId,
      ),
    ]);

    const seats = seatEntitlements.find(
      (entitlement) => entitlement.entitlementKey === "hiring_manager_seats",
    );
    const seatCount = billing.seatCount || seats?.quantity || 0;
    const additionalAssessments = (
      billing.features.additionalAssessmentSlugs ?? []
    ).map((slug) => ({
      slug,
      title: slug,
      maxVersion: "1.0.0",
      summary: null as string | null,
      availableVersions: [] as Array<{
        version: string;
        title: string;
        description: string | null;
      }>,
    }));

    return NextResponse.json({
      data: {
        client: {
          documentId: billing.client.documentId || context.organizationId,
          billingStatus: billing.client.billingStatus,
          autoRenew: billing.client.autoRenew,
        },
        contractActive: billing.client.billingStatus === "active",
        contract: {
          documentId: seats?.id ?? context.organizationId,
          seatCount,
          startDate: seats?.validFrom,
          endDate: seats?.validUntil ?? undefined,
          status:
            billing.client.billingStatus === "active"
              ? "active"
              : seats?.status ?? "draft",
          paymentStatus: billing.client.billingStatus,
          paidAt: null,
          daysUntilExpiry: null,
          tier: billing.tier ?? seats?.source ?? null,
          minimumContractedSeats: seats?.quantity ?? seatCount,
          founderDiscountPercent: null,
          assessmentDataRetentionMonths: null,
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
          availableVersions: [],
        })),
        additionalAssessments,
        requestableAssessments: [],
        canRequestUpgrades: true,
        lockState: {
          operational: false,
          reason: null,
          userMessage: "",
        },
      },
    });
  } catch (error) {
    return handleBffRouteError(error, "Entitlements could not be loaded");
  }
}
