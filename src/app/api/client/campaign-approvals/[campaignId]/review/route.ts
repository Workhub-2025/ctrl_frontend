import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { reviewClientCampaign } from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
export async function POST(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    await requireClientSession();

  const crossOriginResponse = rejectMutatingCrossOrigin(request);
  if (crossOriginResponse) return crossOriginResponse;

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
    return handleBffRouteError(error, "Campaign review could not be submitted");
  
  }
}
