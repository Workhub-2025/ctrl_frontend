import { NextResponse } from "next/server";
import { getClientContract, getClientDashboardSummary } from "@/services/client-portal.service";

export async function GET() {
  try {
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
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Contract could not be loaded" },
      { status: 500 }
    );
  }
}
