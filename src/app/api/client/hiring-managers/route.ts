import { NextResponse } from "next/server";
import {
  getClientDashboardSummary,
  getClientHiringManagers,
} from "@/services/client-portal.service";

export async function GET() {
  try {
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
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Hiring managers could not be loaded",
      },
      { status: 500 }
    );
  }
}
