import { NextResponse } from "next/server";
import { getClientContract, getClientDashboardSummary } from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { isFirebaseAuthProvider } from "@/lib/auth/auth-provider";
import {
  createFirebaseBillingApi,
} from "@/lib/firebase-billing-api";
import { requireFirebaseTenancySession } from "@/lib/firebase-tenancy-bff";
import {
  DEFAULT_PLATFORM_ASSESSMENTS,
  PREMIUM_PLATFORM_ASSESSMENTS,
  resolveAssessmentCatalogueTitle,
} from "@/lib/client/entitlements";

export async function GET() {
  try {
    if (isFirebaseAuthProvider()) {
      const { context, tenancy, domainApi, firebaseSessionCookie } =
        await requireFirebaseTenancySession("client");
      if (!context.organizationId) {
        return NextResponse.json(
          { error: "Organization membership is required" },
          { status: 403 },
        );
      }

      const [seatEntitlements, billing, workspace] = await Promise.all([
        tenancy.listEntitlements(context.organizationId),
        createFirebaseBillingApi(domainApi, firebaseSessionCookie).getEntitlements(
          context.organizationId,
        ),
        tenancy.getClientTeamWorkspace(context.organizationId).catch(() => null),
      ]);

      const seats = seatEntitlements.find(
        (entitlement) => entitlement.entitlementKey === "hiring_manager_seats",
      );
      const seatCount = billing.seatCount || seats?.quantity || 0;
      const commerciallyOperational = billing.commercial?.operational === true;
      const unlockedPremiumSlugs = new Set(
        billing.features.additionalAssessmentSlugs ?? [],
      );

      return NextResponse.json({
        data: {
          contract: {
            documentId:
              billing.commercial?.activeContractId ??
              seats?.id ??
              context.organizationId,
            seatCount,
            startDate: seats?.validFrom ?? null,
            endDate:
              billing.commercial?.contractEndDate ?? seats?.validUntil ?? null,
            status: commerciallyOperational ? "active" : seats?.status ?? "draft",
            paymentStatus: billing.client.billingStatus,
            paidAt: null,
            daysUntilExpiry: null,
            tier: billing.tier ?? seats?.source ?? null,
            minimumContractedSeats: seats?.quantity ?? seatCount,
            founderDiscountPercent: null,
            assessmentDataRetentionMonths: null,
            effectiveAssessmentDataRetentionMonths: 12,
            autoRenew: billing.client.autoRenew,
          },
          client: {
            documentId: billing.client.documentId || context.organizationId,
            billingStatus: billing.client.billingStatus,
            autoRenew: billing.client.autoRenew,
            features: {
              deliveryRemote: billing.features.deliveryRemote,
              deliveryHybrid: billing.features.deliveryHybrid,
              assessmentRecovery: billing.features.assessmentRecovery,
              additionalAssessments: [...unlockedPremiumSlugs].map((slug) => ({
                slug,
                title: resolveAssessmentCatalogueTitle(slug),
              })),
              defaultAssessments: DEFAULT_PLATFORM_ASSESSMENTS.map((assessment) => ({
                slug: assessment.key,
                title: assessment.title,
              })),
              requestableAssessments: PREMIUM_PLATFORM_ASSESSMENTS.filter(
                (assessment) => !unlockedPremiumSlugs.has(assessment.key),
              ).map((assessment) => ({
                slug: assessment.key,
                title: assessment.title,
              })),
            },
          },
          seats: workspace
            ? {
                total: workspace.seatSummary.limit,
                occupied: workspace.seatSummary.used,
                available: workspace.seatSummary.available,
              }
            : {
                total: seatCount,
                occupied: null,
                available: null,
              },
          features: {
            deliveryRemote: billing.features.deliveryRemote,
            deliveryHybrid: billing.features.deliveryHybrid,
            assessmentRecovery: billing.features.assessmentRecovery,
          },
        },
      });
    }

    await requireClientSession();

    const summary = await getClientDashboardSummary();
    const clientDocumentId = summary?.client?.documentId;
    if (!clientDocumentId) {
      return NextResponse.json({ error: "Client account could not be resolved" }, { status: 403 });
    }
    const contract = await getClientContract(clientDocumentId);
    return NextResponse.json({
      data: {
        contract,
        client: summary.client,
        seats: summary?.seats,
        features: summary?.client?.features ?? null,
      },
    });
  } catch (error) {
    return handleBffRouteError(error, "Contract could not be loaded");
  }
}
