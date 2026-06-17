import { NextResponse } from "next/server";
import {
  getClientDashboardSummary,
  getClientHiringManagers,
} from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
export async function GET() {
  try {
    await requireClientSession();

    const summary = await getClientDashboardSummary();
    const clientDocumentId = summary?.client?.documentId;

    if (!clientDocumentId) {
      return NextResponse.json(
        { error: "Client account could not be resolved" },
        { status: 403 }
      );
    }

    const managers = await getClientHiringManagers(clientDocumentId);
    return NextResponse.json({ data: managers });
  } catch (error) {
    return handleBffRouteError(error, "Hiring managers could not be loaded");
  
  }
}
