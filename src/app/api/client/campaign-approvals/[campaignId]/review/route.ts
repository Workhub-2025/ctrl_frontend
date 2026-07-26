import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { handleBffRouteError } from "@/lib/auth/bff-session";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import {
  requireFirebaseRecruitmentSession,
  toClientCampaign,
} from "@/lib/firebase-recruitment-bff";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";
import { containsHtmlMarkup, sanitisePlainText } from "@/lib/security/input-sanitization";
export async function POST(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const { session, context: actor, recruitment } =
      await requireFirebaseRecruitmentSession("client");

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

    const workspace = await recruitment.getCampaign(campaignId);
    await recruitment.reviewCampaign(campaignId, {
      expectedVersion: workspace.campaign.version,
      decision: body.decision,
      rationale: note || "No rationale provided",
      idempotencyKey: recruitmentIdempotencyKey(
        "campaign:review",
        actor.userId,
        {
          campaignId,
          campaignVersion: workspace.campaign.version,
          decision: body.decision,
          note: note || "",
        },
      ),
    });
    const updated = await recruitment.getCampaign(campaignId);

    return NextResponse.json({
      data: toClientCampaign(updated.campaign, updated),
    });
  } catch (error) {
    return handleBffRouteError(error, "Campaign review could not be submitted");
  
  }
}
