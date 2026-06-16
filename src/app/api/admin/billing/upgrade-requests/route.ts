import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { isAdminRole } from "@/lib/auth/role-model";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";
import { parseBillingRequestFromTicket } from "@/lib/client/entitlements";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.jwt) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  }

  try {
    const response = await strapiRequest<{
      data?: Array<Record<string, unknown>>;
    }>("/support-tickets?category=feature_request");

    const data = (response.data ?? [])
      .map((ticket) => {
        const record = parseBillingRequestFromTicket({
          id: String(ticket.documentId ?? ticket.id ?? ""),
          ticketNumber: String(ticket.ticketNumber ?? ""),
          subject: String(ticket.subject ?? ""),
          status: String(ticket.status ?? "open"),
          priority: String(ticket.priority ?? "normal"),
          createdAt: String(ticket.createdAt ?? ""),
          metadata: ticket.metadata as Record<string, unknown> | null,
        });
        if (!record || record.requestKind !== "client_upgrade") return null;
        return {
          ...record,
          billingStatus: String(ticket.billingStatus ?? "none"),
          amountDuePence: ticket.amountDuePence ?? null,
          currency: String(ticket.currency ?? "gbp"),
          stripeCheckoutSessionId: ticket.stripeCheckoutSessionId ?? null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upgrade requests could not be loaded" },
      { status: 500 }
    );
  }
}
