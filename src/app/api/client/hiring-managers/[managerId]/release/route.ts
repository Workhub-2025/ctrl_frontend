import { NextResponse } from "next/server";
import {
  getClientDashboardSummary,
  releaseClientHiringManagerSeat,
} from "@/services/client-portal.service";

export async function POST(
  request: Request,
  context: { params: Promise<any> }
) {
  try {
    const { managerId } = await context.params;
    const summary = await getClientDashboardSummary();
    const clientDocumentId = summary?.client?.documentId;

    if (!clientDocumentId) {
      return NextResponse.json(
        { error: "Client account could not be resolved" },
        { status: 403 }
      );
    }

    const released = await releaseClientHiringManagerSeat(clientDocumentId, managerId);
    return NextResponse.json({ data: released });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Hiring-manager seat could not be released",
      },
      { status: 500 }
    );
  }
}
