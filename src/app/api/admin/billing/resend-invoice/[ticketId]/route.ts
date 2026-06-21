import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { isStripeCheckoutConfigured } from "@/lib/stripe/server";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const auth = await requireAdminApiAccess('billing.write');
  if ("error" in auth) {
    return auth.error;
  }

  if (!isStripeCheckoutConfigured()) {
    return NextResponse.json(
      {
        error:
          "Stripe checkout is not configured. Set STRIPE_SECRET_KEY in FrontEnd/.env.local and restart the dev server.",
      },
      { status: 503 }
    );
  }

  const { ticketId: requestId } = await params;

  try {
    const response = await strapiRequest<{ data?: Record<string, unknown> }>(
      `/admin/billing/requests/${encodeURIComponent(requestId)}/resend-checkout`,
      { method: "POST" }
    );

    return NextResponse.json({
      data: response.data,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invoice link could not be resent" },
      { status: 500 }
    );
  }
}
