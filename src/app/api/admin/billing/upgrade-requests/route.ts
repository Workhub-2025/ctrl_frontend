import { NextResponse } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import { createFirebaseBillingApi } from "@/lib/firebase-billing-api";

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
  const auth = await requireAdminDualAccess("billing.read");
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const billing = createFirebaseBillingApi(
      auth.domainApi,
      auth.firebaseSessionCookie,
    );
    const rows = await billing.listAdminBillingRequests();
    const data = (rows ?? [])
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
        createdAt:
          typeof row.createdAt === "string"
            ? row.createdAt
            : row.createdAt
              ? new Date(row.createdAt as unknown as string).toISOString()
              : "",
        payload: row.payload ?? null,
      }));
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upgrade requests could not be loaded",
      },
      { status: 500 },
    );
  }
}
