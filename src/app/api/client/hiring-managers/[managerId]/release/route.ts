import { NextResponse } from "next/server";
import {
  getClientDashboardSummary,
  releaseClientHiringManagerSeat,
} from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
export async function POST(
  request: Request,
  context: { params: Promise<any> }
) {
  try {
    await requireClientSession();

  const crossOriginResponse = rejectMutatingCrossOrigin(request);
  if (crossOriginResponse) return crossOriginResponse;

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
    return handleBffRouteError(error, "Hiring manager could not be released");
  
  }
}
