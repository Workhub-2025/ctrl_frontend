import { NextResponse } from "next/server";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import {
  createFirebaseBillingApi,
  requireFirebaseBillingSession,
} from "@/lib/firebase-billing-api";

export async function POST(request: Request) {
  try {
    const firebaseAuth = await requireFirebaseBillingSession();
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;
    const billing = createFirebaseBillingApi(
      firebaseAuth.domainApi,
      firebaseAuth.firebaseSessionCookie,
    );
    const portal = await billing.openPortal();
    return NextResponse.json({ data: portal });
  } catch (error) {
    return handleBffRouteError(error, "Stripe billing portal could not be loaded");
  }
}
