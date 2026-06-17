import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import {
  deleteHiringManagerCampaign,
  getHiringManagerCampaignDetail,
} from "@/services/hiring-manager-campaigns.service";

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

import { requireHmSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
export async function GET(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    await requireHmSession();

    const limited = await enforceRateLimit(request, "get");
    if (limited) return limited;

    const { campaignId } = await context.params;
    const result = await getHiringManagerCampaignDetail(campaignId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ data: result.campaign });
  } catch (error) {
    return handleBffRouteError(error, "Campaign could not be loaded");
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    await requireHmSession();

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const limited = await enforceRateLimit(request, "delete");
    if (limited) return limited;

    try {
      const { campaignId } = await context.params;
      await deleteHiringManagerCampaign(campaignId);
      return NextResponse.json({ data: { deleted: true } });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Campaign could not be deleted",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleBffRouteError(error, "Campaign could not be loaded");
  }
}
