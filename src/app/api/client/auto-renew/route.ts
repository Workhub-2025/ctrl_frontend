import { NextResponse } from "next/server";
import {
  getClientDashboardSummary,
  updateClientAutoRenew,
} from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { isFirebaseAuthProvider } from "@/lib/auth/auth-provider";
import { createFirebaseBillingApi } from "@/lib/firebase-billing-api";
import { requireFirebaseTenancySession } from "@/lib/firebase-tenancy-bff";
import { invalidateFirebaseClientPortalCaches } from "@/lib/portal-cache-invalidation";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

export async function POST(request: Request) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const body = await request.json().catch(() => ({}));
    const autoRenew = body.autoRenew === true;

    // Firebase path: contract auto-renew is stored on the billing account and
    // written through the private domain API. Preserve the legacy Strapi branch
    // below for the not-yet-cut-over Production deployments.
    if (isFirebaseAuthProvider()) {
      const { context, domainApi, firebaseSessionCookie } =
        await requireFirebaseTenancySession("client");
      if (!context.organizationId) {
        return NextResponse.json(
          { error: "Organization membership is required" },
          { status: 403 },
        );
      }
      const result = await createFirebaseBillingApi(
        domainApi,
        firebaseSessionCookie,
      ).setAutoRenew(autoRenew);
      void invalidateFirebaseClientPortalCaches({
        firebaseUid: context.firebaseUid,
        organizationId: context.organizationId,
      });
      return NextResponse.json({
        data: {
          documentId: result.organizationId,
          autoRenew: result.autoRenew,
        },
      });
    }

    await requireClientSession();

    const summary = await getClientDashboardSummary();
    const clientDocumentId = summary?.client?.documentId;

    if (!clientDocumentId) {
      return NextResponse.json(
        { error: "Client account could not be resolved" },
        { status: 400 }
      );
    }

    const client = await updateClientAutoRenew(clientDocumentId, autoRenew);
    return NextResponse.json({ data: client });
  } catch (error) {
    return handleBffRouteError(error, "Auto-renew could not be updated");
  }
}
