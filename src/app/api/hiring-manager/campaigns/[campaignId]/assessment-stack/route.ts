import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { updateHiringManagerCampaignAssessmentStack } from "@/services/hiring-manager-campaigns.service";

import { requireHmSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
) {
  try {
    await requireHmSession();

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const session = await getServerSession(authOptions);
    const limiter = await applyRateLimit({
      key: `hm-campaign-stack:put:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        { status: 429, headers: { "retry-after": String(limiter.retryAfterSeconds) } }
      );
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    try {
      const { campaignId } = await context.params;
      const body = await request.json().catch(() => ({}));
      const assessmentDocumentIds = Array.isArray(body?.assessmentDocumentIds)
        ? body.assessmentDocumentIds.filter((value: unknown) => typeof value === "string")
        : [];

      if (assessmentDocumentIds.length === 0) {
        return NextResponse.json({ error: "At least one assessment is required" }, { status: 400 });
      }

      await updateHiringManagerCampaignAssessmentStack(campaignId, {
        assessmentDocumentIds,
        assessmentSettings:
          body?.assessmentSettings && typeof body.assessmentSettings === "object"
            ? body.assessmentSettings
            : undefined,
        assessmentMode:
          body?.assessmentMode === "remote" ||
          body?.assessmentMode === "hybrid" ||
          body?.assessmentMode === "in_person"
            ? body.assessmentMode
            : undefined,
      });

      return NextResponse.json({ data: { updated: true } });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Assessment stack could not be updated",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    return handleBffRouteError(error, "Assessment stack could not be updated");
  }
}
