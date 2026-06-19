import { NextResponse } from "next/server";
import {
  getClientDashboardSummary,
  updateClientCampaignApprovalMode,
} from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

type ApprovalMode = "auto_approve" | "require_approval";

function resolveApprovalMode(body: Record<string, unknown>): ApprovalMode | null {
  if (body.mode === "auto_approve" || body.mode === "require_approval") {
    return body.mode;
  }

  if (typeof body.autoApprove === "boolean") {
    return body.autoApprove ? "auto_approve" : "require_approval";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    await requireClientSession();

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const body = await request.json().catch(() => ({}));
    const mode = resolveApprovalMode(body as Record<string, unknown>);

    if (!mode) {
      return NextResponse.json(
        { error: "mode must be auto_approve or require_approval" },
        { status: 400 }
      );
    }

    const summary = await getClientDashboardSummary();
    const clientDocumentId = summary?.client?.documentId;

    if (!clientDocumentId) {
      return NextResponse.json(
        { error: "Client account could not be resolved" },
        { status: 400 }
      );
    }

    const client = await updateClientCampaignApprovalMode(clientDocumentId, mode);
    return NextResponse.json({ data: client });
  } catch (error) {
    return handleBffRouteError(error, "Approval mode could not be updated");
  }
}
