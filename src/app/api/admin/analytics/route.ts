import { NextResponse } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import type { FirebaseOrganization } from "@/lib/firebase-admin-tenancy-bff";
import { getAdminRevenueAnalytics } from "@/services/admin-platform.service";

const FIREBASE_PENDING_ANALYTICS = {
  generatedAt: new Date(0).toISOString(),
  currency: "GBP",
  summary: {
    annualRecurringPence: 0,
    monthlyRecurringPence: 0,
    collectedThisMonthPence: 0,
    collectedYearToDatePence: 0,
    outstandingInvoicePence: 0,
    requestedPipelinePence: 0,
    renewalPipelinePence: 0,
    activeContracts: 0,
    activeClients: 0,
    activeSeats: 0,
    averageRevenuePerClientPence: 0,
  },
  byTier: [],
  monthlyCollections: [],
  pipeline: [],
  attention: [
    {
      id: "firebase-billing-pending",
      title: "Revenue analytics pending Wave 5 billing",
      detail:
        "Organization tenancy is live on Firebase, but contracts and Stripe aggregates are not ported yet. Figures below stay at zero until billing migrates.",
    },
  ],
} as const;

export async function GET() {
  try {
    const auth = await requireAdminDualAccess("analytics.read");
    if ("error" in auth) return auth.error;

    if (isFirebaseAdminAuth(auth)) {
      const organizations = await auth.domainApi
        .request<FirebaseOrganization[]>({
          path: "/v1/organizations",
          firebaseSessionCookie: auth.firebaseSessionCookie,
        })
        .catch(() => [] as FirebaseOrganization[]);
      return NextResponse.json({
        data: {
          ...FIREBASE_PENDING_ANALYTICS,
          generatedAt: new Date().toISOString(),
          summary: {
            ...FIREBASE_PENDING_ANALYTICS.summary,
            activeClients: organizations.filter(
              (organization) => organization.status === "active",
            ).length,
          },
        },
      });
    }

    const analytics = await getAdminRevenueAnalytics(auth.cmsJwt);
    return NextResponse.json({ data: analytics });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Revenue analytics could not be loaded",
      },
      { status: 500 },
    );
  }
}
