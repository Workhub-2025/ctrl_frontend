import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { normalizeRole } from "@/lib/auth/role-model";
import {
  fulfillBillingRequest,
  parseBillingCheckoutMetadata,
} from "@/lib/stripe/fulfill-billing";
import { getStripeClient, isStripeCheckoutConfigured } from "@/lib/stripe/server";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { getStrapiApiBaseUrl, joinStrapiApiPath } from "@/lib/strapi-server";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
export async function POST(request: NextRequest) {
  try {
    await requireClientSession();

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const originRejected = rejectCrossOriginRequest(request);
    if (originRejected) {
      return originRejected;
    }

    const rateLimit = await applyRateLimit({
      key: `billing:confirm:${extractClientIp(request)}`,
      limit: 20,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds ?? 60) } }
      );
    }

    const session = await getServerSession(authOptions);
    const strapiJwt = await getServerStrapiJwt(request);

    if (!session?.user?.id || !strapiJwt) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (normalizeRole(session.user.role) !== "client") {
      return NextResponse.json({ error: "Client access required" }, { status: 403 });
    }
    if (!isStripeCheckoutConfigured()) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      stripeCheckoutSessionId?: string;
      sessionId?: string;
    };
    const stripeCheckoutSessionId = body.stripeCheckoutSessionId ?? body.sessionId;
    if (!stripeCheckoutSessionId) {
      return NextResponse.json({ error: "stripeCheckoutSessionId is required" }, { status: 400 });
    }

    try {
      const entitlementsResponse = await fetch(joinStrapiApiPath(getStrapiApiBaseUrl(), "/client/entitlements"), {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${strapiJwt}`,
        },
      });
      const entitlementsBody = (await entitlementsResponse.json().catch(() => null)) as {
        data?: { client?: { documentId?: string } };
        error?: { message?: string } | string;
      } | null;

      if (!entitlementsResponse.ok) {
        const message =
          typeof entitlementsBody?.error === "string"
            ? entitlementsBody.error
            : entitlementsBody?.error?.message ?? "Client account could not be resolved";
        return NextResponse.json({ error: message }, { status: entitlementsResponse.status });
      }

      const clientDocumentId = entitlementsBody?.data?.client?.documentId;
      if (!clientDocumentId) {
        return NextResponse.json({ error: "Client account could not be resolved" }, { status: 403 });
      }

      const stripe = getStripeClient();
      const checkoutSession = await stripe.checkout.sessions.retrieve(stripeCheckoutSessionId);
      if (checkoutSession.payment_status !== "paid") {
        return NextResponse.json({ error: "Payment is not complete yet" }, { status: 400 });
      }

      const metadata = parseBillingCheckoutMetadata(checkoutSession);
      if (!metadata) {
        return NextResponse.json({ error: "Checkout session is not a billing payment" }, { status: 400 });
      }
      if (metadata.clientDocumentId !== clientDocumentId) {
        return NextResponse.json({ error: "Checkout session does not belong to this client" }, { status: 403 });
      }

      const fulfillment = await fulfillBillingRequest({
        clientDocumentId: metadata.clientDocumentId,
        billingRequestDocumentId: metadata.billingRequestDocumentId,
        stripeCheckoutSessionId: checkoutSession.id,
        stripeInvoiceId:
          typeof checkoutSession.invoice === "string" ? checkoutSession.invoice : undefined,
      });

      return NextResponse.json({
        data: {
          billingRequestDocumentId: metadata.billingRequestDocumentId,
          billingStatus: "paid",
          alreadyPaid: fulfillment.alreadyPaid === true,
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Payment could not be confirmed" },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleBffRouteError(error, "Billing confirmation failed");
  }
}
