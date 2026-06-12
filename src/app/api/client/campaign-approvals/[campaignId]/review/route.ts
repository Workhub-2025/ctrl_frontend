import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { reviewClientCampaign } from "@/services/client-portal.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const { campaignId } = await context.params;
    const body = await request.json().catch(() => ({}));
    if (!["approved", "rejected"].includes(body?.decision)) {
      return NextResponse.json(
        { error: "decision must be approved or rejected" },
        { status: 400 }
      );
    }

    const campaign = await reviewClientCampaign({
      campaignDocumentId: campaignId,
      decision: body.decision,
      note: typeof body.note === "string" ? body.note : undefined,
    });

    return NextResponse.json({ data: campaign });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Campaign could not be reviewed",
      },
      { status: 500 }
    );
  }
}
