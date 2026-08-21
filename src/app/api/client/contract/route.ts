import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { requireFirebaseTenancySession } from "@/lib/firebase-tenancy-bff";
import { loadClientBillingState } from "@/lib/client-billing-state";
import {
  DEFAULT_PLATFORM_ASSESSMENTS,
  PREMIUM_PLATFORM_ASSESSMENTS,
  resolveAssessmentCatalogueTitle,
} from "@/lib/client/entitlements";

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

    const [billingState, workspace] = await Promise.all([
      loadClientBillingState({
        organizationId: context.organizationId,
        tenancy,
        domainApi,
        firebaseSessionCookie,
      }),
      tenancy.getClientTeamWorkspace(context.organizationId).catch(() => null),
    ]);

    const {
      contract,
      client,
      seatCount,
      platformFeatures,
      unlockedPremiumSlugs,
    } = billingState;

    return NextResponse.json({
      data: {
        contract: {
          ...contract,
          startDate: contract.startDate ?? null,
          endDate: contract.endDate ?? null,
          tier: contract.tier ?? null,
          paidAt: null,
          daysUntilExpiry: null,
          founderDiscountPercent: null,
          assessmentDataRetentionMonths: null,
        },
        client: {
          documentId: client.documentId,
          billingStatus: client.billingStatus,
          autoRenew: client.autoRenew,
          features: {
            ...platformFeatures,
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
        features: platformFeatures,
      },
    });
  } catch (error) {
    return handleBffRouteError(error, "Contract could not be loaded");
  }
}
