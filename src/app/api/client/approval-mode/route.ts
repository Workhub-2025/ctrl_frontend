import { NextResponse } from "next/server";
import { updateClientCampaignApprovalMode } from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
export async function POST(request: Request) {
  try {
    await requireClientSession();

  const crossOriginResponse = rejectMutatingCrossOrigin(request);
  if (crossOriginResponse) return crossOriginResponse;

    const body = await request.json().catch(() => ({}));
    const mode = body?.mode;
    const clientDocumentId =
      typeof body?.clientDocumentId === "string" ? body.clientDocumentId : "";

    if (!["auto_approve", "require_approval"].includes(mode)) {
      return NextResponse.json(
        { error: "mode must be auto_approve or require_approval" },
        { status: 400 }
      );
    }

    if (!clientDocumentId) {
      return NextResponse.json(
        { error: "clientDocumentId is required" },
        { status: 400 }
      );
    }

    const client = await updateClientCampaignApprovalMode(clientDocumentId, mode);
    return NextResponse.json({ data: client });
  } catch (error) {
    return handleBffRouteError(error, "Approval mode could not be updated");
  
  }
}
