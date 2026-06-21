import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

export type AdminUpgradeRequestRow = {
  documentId?: string;
  id?: string;
  requestNumber?: string;
  clientDocumentId?: string;
  clientName?: string;
  requestKind?: string;
  upgradeType?: string;
  subject?: string;
  description?: string;
  payload?: Record<string, unknown>;
  billingStatus?: string;
  amountDuePence?: number | null;
  currency?: string;
  stripeCheckoutSessionId?: string | null;
  createdAt?: string;
};

export async function GET() {
  const auth = await requireAdminApiAccess('billing.read');
  if ("error" in auth) {
    return auth.error;
  }
  const strapiJwt = auth.strapiJwt;

  try {
    const response = await strapiRequest<{ data?: AdminUpgradeRequestRow[] }>(
      "/admin/billing/upgrade-requests"
    );

    const data = (response.data ?? [])
      .filter((row) => row.requestKind === "client_upgrade")
      .map((row) => ({
        id: String(row.documentId ?? row.id ?? ""),
        requestNumber: row.requestNumber ?? "",
        clientDocumentId: row.clientDocumentId ?? "",
        clientName: row.clientName ?? "Unknown client",
        subject: row.subject ?? "",
        upgradeType: row.upgradeType ?? "",
        billingStatus: row.billingStatus ?? "requested",
        amountDuePence: row.amountDuePence ?? null,
        currency: row.currency ?? "gbp",
        createdAt: row.createdAt ?? "",
        payload: row.payload ?? null,
      }));

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upgrade requests could not be loaded" },
      { status: 500 }
    );
  }
}
