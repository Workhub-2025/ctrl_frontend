import { NextResponse } from "next/server";
import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { getClientDashboardSummary } from "@/services/client-portal.service";
import { getStripeClient } from "@/lib/stripe/server";
import { getStripeAppUrl } from "@/lib/stripe/billing-checkout";
import { resolveBillingPortalConfigurationId } from "@/lib/stripe/billing-portal";
import { strapiServerClient } from "@/lib/strapi";

export async function POST(request: Request) {
  try {
    const { session } = await requireClientSession();

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const summary = await getClientDashboardSummary();
    const clientDocumentId = summary?.client?.documentId;

    if (!clientDocumentId) {
      return NextResponse.json(
        { error: "Client account could not be resolved" },
        { status: 400 }
      );
    }

    let stripeCustomerId = summary?.client?.stripeCustomerId?.trim();

    const stripe = getStripeClient();

    if (!stripeCustomerId) {
      // Create Stripe customer on-the-fly
      const customer = await stripe.customers.create({
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
        metadata: {
          clientDocumentId,
        },
      });
      stripeCustomerId = customer.id;

      // Update Client record in Strapi
      await strapiServerClient.fetch(`/clients/${clientDocumentId}`, {
        method: "PUT",
        body: JSON.stringify({
          data: { stripeCustomerId },
        }),
      });
    }

    const portalConfigurationId = await resolveBillingPortalConfigurationId();

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      configuration: portalConfigurationId,
      return_url: `${getStripeAppUrl()}/client-dashboard/upgrade-requests/`,
    });

    return NextResponse.json({ data: { url: portalSession.url } });
  } catch (error) {
    return handleBffRouteError(error, "Stripe billing portal could not be loaded");
  }
}
