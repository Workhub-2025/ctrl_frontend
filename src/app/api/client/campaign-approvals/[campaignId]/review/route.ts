import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { reviewClientCampaign } from "@/services/client-portal.service";

import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";
import { containsHtmlMarkup, sanitisePlainText } from "@/lib/security/input-sanitization";
export async function POST(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const { session } = await requireClientSession();

  const crossOriginResponse = rejectMutatingCrossOrigin(request);
  if (crossOriginResponse) return crossOriginResponse;

    const rateLimited = await rejectRateLimitedMutation(request, {
      scope: "client:campaign-review",
      actorId: session.user.id,
      limit: 20,
    });
    if (rateLimited) return rateLimited;

    const { campaignId } = await context.params;
    const body = await request.json().catch(() => ({}));
    if (!["approved", "rejected"].includes(body?.decision)) {
      return NextResponse.json(
        { error: "decision must be approved or rejected" },
        { status: 400 }
      );
    }

    if (containsHtmlMarkup(body?.note)) {
      return NextResponse.json({ error: "Review notes must be plain text" }, { status: 400 });
    }
    const note = sanitisePlainText(body?.note, { maxLength: 500, allowNewlines: true });

    const campaign = await reviewClientCampaign({
      campaignDocumentId: campaignId,
      decision: body.decision,
      note: note || undefined,
    });

    return NextResponse.json({ data: campaign });
  } catch (error) {
    return handleBffRouteError(error, "Campaign review could not be submitted");
  
  }
}
