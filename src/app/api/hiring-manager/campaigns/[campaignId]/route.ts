import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import {
  requireFirebaseRecruitmentSession,
  toHiringManagerCampaignDetail,
} from "@/lib/firebase-recruitment-bff";

async function enforceRateLimit(request: NextRequest, action: "get" | "delete") {
  const session = await getServerSession(authOptions);
  const limiter = await applyRateLimit({
    key: `hm-campaign:${action}:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
    limit: action === "get" ? 40 : 8,
    windowMs: 60_000,
  });

  if (limiter.allowed) return null;

  return NextResponse.json(
    { error: "Too many requests. Please retry shortly." },
    { status: 429, headers: { "retry-after": String(limiter.retryAfterSeconds) } }
  );
}

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
export async function GET(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const { recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");

    const limited = await enforceRateLimit(request, "get");
    if (limited) return limited;

    const { campaignId } = await context.params;
    const workspace = await recruitment.getCampaign(campaignId);
    const assignments = await recruitment.listAssignments(campaignId);
    return NextResponse.json({
      data: toHiringManagerCampaignDetail(workspace, assignments.items),
    });
  } catch (error) {
    return handleBffRouteError(error, "Campaign could not be loaded");
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const { context: actor, recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const limited = await enforceRateLimit(request, "delete");
    if (limited) return limited;

    const { campaignId } = await context.params;
    const workspace = await recruitment.getCampaign(campaignId);
    await recruitment.archiveCampaign(campaignId, {
      expectedVersion: workspace.campaign.version,
      idempotencyKey: recruitmentIdempotencyKey(
        "campaign:archive",
        actor.userId,
        { campaignId, version: workspace.campaign.version },
      ),
    });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return handleBffRouteError(error, "Campaign could not be loaded");
  }
}
