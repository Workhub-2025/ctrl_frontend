import { NextResponse } from "next/server";
import { getClientContract, getClientDashboardSummary } from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
export async function GET() {
  try {
    await requireClientSession();

    const summary = await getClientDashboardSummary();
    const clientDocumentId = summary?.client?.documentId;
    if (!clientDocumentId) {
      return NextResponse.json({ error: "Client account could not be resolved" }, { status: 403 });
    }
    const contract = await getClientContract(clientDocumentId);
    return NextResponse.json({
      data: {
        contract,
        client: summary.client,
        seats: summary?.seats,
        features: summary?.client?.features ?? null,
      },
    });
  } catch (error) {
    return handleBffRouteError(error, "Contract could not be loaded");
  }
}
