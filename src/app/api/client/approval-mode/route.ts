import { NextResponse } from "next/server";
import { updateClientCampaignApprovalMode } from "@/services/client-portal.service";

export async function POST(request: Request) {
  try {
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
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Campaign approval mode could not be updated",
      },
      { status: 500 }
    );
  }
}
