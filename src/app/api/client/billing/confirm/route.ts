import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { invalidateAdminPlatformServerCache, invalidateFirebaseClientPortalCaches } from "@/lib/portal-cache-invalidation";
import {
  createFirebaseBillingApi,
  requireFirebaseBillingSession,
} from "@/lib/firebase-billing-api";

export async function POST(request: NextRequest) {
  try {
    const firebaseAuth = await requireFirebaseBillingSession();
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;
    const originRejected = rejectCrossOriginRequest(request);
    if (originRejected) return originRejected;

    const rateLimit = await applyRateLimit({
      key: `billing:confirm:${extractClientIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds ?? 60) },
        },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      stripeCheckoutSessionId?: string;
      sessionId?: string;
    };
    const stripeCheckoutSessionId = body.stripeCheckoutSessionId ?? body.sessionId;
    if (!stripeCheckoutSessionId) {
      return NextResponse.json(
        { error: "stripeCheckoutSessionId is required" },
        { status: 400 },
      );
    }

    const billing = createFirebaseBillingApi(
      firebaseAuth.domainApi,
      firebaseAuth.firebaseSessionCookie,
    );
    const confirmation = await billing.confirmCheckout(stripeCheckoutSessionId);
    void invalidateFirebaseClientPortalCaches({
      firebaseUid: firebaseAuth.firebaseUid,
      organizationId:
        typeof (confirmation as { organizationId?: string }).organizationId ===
        "string"
          ? (confirmation as { organizationId?: string }).organizationId
          : firebaseAuth.session.user.organization ?? null,
    });
    void invalidateAdminPlatformServerCache();
    return NextResponse.json({ data: confirmation });
  } catch (error) {
    return handleBffRouteError(error, "Billing confirmation failed");
  }
}
