import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { normalizeRole } from "@/lib/auth/role-model";
import { getStripeClient, isStripeCheckoutConfigured } from "@/lib/stripe/server";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";

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
      key: `billing:checkout:${extractClientIp(request)}`,
      limit: 30,
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
      billingRequestDocumentId?: string;
      ticketDocumentId?: string;
    };
    const billingRequestDocumentId = body.billingRequestDocumentId ?? body.ticketDocumentId;
    if (!billingRequestDocumentId) {
      return NextResponse.json({ error: "billingRequestDocumentId is required" }, { status: 400 });
    }

    try {
      const checkoutResponse = await strapiRequest<{
        data?: {
          stripeCheckoutSessionId?: string;
          billingStatus?: string;
          amountDuePence?: number | null;
          currency?: string;
        };
      }>("/client/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ billingRequestDocumentId }),
      });

      const checkout = checkoutResponse.data;
      if (!checkout?.stripeCheckoutSessionId) {
        return NextResponse.json({ error: "No invoice is available for this request yet" }, { status: 404 });
      }

      const stripe = getStripeClient();
      const checkoutSession = await stripe.checkout.sessions.retrieve(checkout.stripeCheckoutSessionId);
      if (!checkoutSession.url) {
        return NextResponse.json(
          { error: "Checkout link has expired. Contact CTRL support to resend the invoice." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        data: {
          checkoutUrl: checkoutSession.url,
          billingStatus: checkout.billingStatus ?? "invoice_sent",
          amountDuePence: checkout.amountDuePence ?? null,
          currency: checkout.currency ?? "gbp",
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Checkout could not be opened" },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleBffRouteError(error, "Billing checkout could not be started");
  }
}
