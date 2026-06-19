import { NextResponse } from "next/server";
import {
  getClientDashboardSummary,
  updateClientAutoRenew,
} from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

export async function POST(request: Request) {
  try {
    await requireClientSession();

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const body = await request.json().catch(() => ({}));
    const autoRenew = body.autoRenew === true;

    const summary = await getClientDashboardSummary();
    const clientDocumentId = summary?.client?.documentId;

    if (!clientDocumentId) {
      return NextResponse.json(
        { error: "Client account could not be resolved" },
        { status: 400 }
      );
    }

    const client = await updateClientAutoRenew(clientDocumentId, autoRenew);
    return NextResponse.json({ data: client });
  } catch (error) {
    return handleBffRouteError(error, "Auto-renew could not be updated");
  }
}
