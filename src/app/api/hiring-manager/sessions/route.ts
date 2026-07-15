import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import {
  createHiringManagerAssessmentSession,
  getHiringManagerCampaignDetail,
  getHiringManagerSessions,
} from "@/services/hiring-manager-campaigns.service";

import { requireHmSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import {
  canCreateSessionForCampaign,
  getSessionCreationApprovalError,
} from "@/lib/hiring-manager/campaign-session-approval";
import {
  containsHtmlMarkup,
  sanitisePlainText,
} from "@/lib/security/input-sanitization";
export async function GET(request: NextRequest) {
  try {
    await requireHmSession();

    const session = await getServerSession(authOptions);
    const limiter = await applyRateLimit({
      key: `hm-sessions:get:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        {
          status: 429,
          headers: {
            "retry-after": String(limiter.retryAfterSeconds),
          },
        }
      );
    }

    const result = await getHiringManagerSessions();

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ data: result.sessions });
  } catch (error) {
    return handleBffRouteError(error, "Sessions could not be loaded");
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireHmSession();

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const session = await getServerSession(authOptions);
    const limiter = await applyRateLimit({
      key: `hm-sessions:post:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        {
          status: 429,
          headers: {
            "retry-after": String(limiter.retryAfterSeconds),
          },
        }
      );
    }

    try {
      const rawBody = await request.json();
      if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
        return NextResponse.json(
          { error: "Request body must be an object" },
          { status: 400 }
        );
      }
      const body = rawBody as Record<string, unknown>;
      const campaignDocumentId = sanitisePlainText(body?.campaignDocumentId, {
        maxLength: 128,
      });
      const name = sanitisePlainText(body?.name, { maxLength: 120 });
      const location = sanitisePlainText(body?.location, { maxLength: 180 });
      const candidateLimit = body.candidateLimit;
      const requestedMode = body.mode;
      const startsAt = body.startsAt;

      if (!campaignDocumentId || !/^[A-Za-z0-9_-]+$/.test(campaignDocumentId)) {
        return NextResponse.json({ error: "campaignDocumentId is required" }, { status: 400 });
      }
      if (!name || containsHtmlMarkup(body?.name)) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
      }
      if (
        typeof candidateLimit !== "number" ||
        !Number.isInteger(candidateLimit) ||
        candidateLimit < 1 ||
        candidateLimit > 500
      ) {
        return NextResponse.json(
          { error: "candidateLimit must be between 1 and 500" },
          { status: 400 }
        );
      }
      if (
        requestedMode !== undefined &&
        requestedMode !== null &&
        requestedMode !== "in_person" &&
        requestedMode !== "remote"
      ) {
        return NextResponse.json({ error: "mode must be either 'in_person' or 'remote'" }, { status: 400 });
      }
      if (body.location && containsHtmlMarkup(body.location)) {
        return NextResponse.json({ error: "location must be plain text" }, { status: 400 });
      }
      if (
        startsAt !== undefined &&
        startsAt !== null &&
        (typeof startsAt !== "string" ||
          Number.isNaN(new Date(startsAt).getTime()))
      ) {
        return NextResponse.json({ error: "startsAt must be a valid date" }, { status: 400 });
      }

      const campaignResult = await getHiringManagerCampaignDetail(campaignDocumentId);
      if (campaignResult.error || !campaignResult.campaign) {
        return NextResponse.json(
          { error: campaignResult.error || "Campaign could not be found." },
          { status: 404 }
        );
      }
      if (!canCreateSessionForCampaign(campaignResult.campaign.approvalStatus)) {
        return NextResponse.json(
          {
            error: getSessionCreationApprovalError(
              campaignResult.campaign.approvalStatus
            ),
          },
          { status: 409 }
        );
      }

      const created = await createHiringManagerAssessmentSession({
        campaignDocumentId,
        name,
        candidateLimit,
        startsAt: typeof startsAt === "string" ? startsAt : null,
        location: location || null,
        mode:
          requestedMode === "in_person" || requestedMode === "remote"
            ? requestedMode
            : null,
      });

      return NextResponse.json({ data: created }, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Session could not be created",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleBffRouteError(error, "Sessions could not be loaded");
  }
}
