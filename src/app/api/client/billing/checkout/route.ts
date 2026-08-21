import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
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
      key: `billing:checkout:${extractClientIp(request)}`,
      limit: 30,
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
      billingRequestDocumentId?: string;
      billingRequestId?: string;
    };
    const billingRequestId =
      body.billingRequestId ?? body.billingRequestDocumentId;
    if (!billingRequestId) {
      return NextResponse.json(
        { error: "billingRequestDocumentId is required" },
        { status: 400 },
      );
    }

    const billing = createFirebaseBillingApi(
      firebaseAuth.domainApi,
      firebaseAuth.firebaseSessionCookie,
    );
    const checkout = await billing.openCheckout(billingRequestId);
    return NextResponse.json({ data: checkout });
  } catch (error) {
    return handleBffRouteError(error, "Billing checkout could not be started");
  }
}
