import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import {
  requireFirebaseRecruitmentSession,
  toHiringManagerSession,
} from "@/lib/firebase-recruitment-bff";
import { sessionJoinUrl } from "@/lib/public-app-urls";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import {
  containsHtmlMarkup,
  sanitisePlainText,
} from "@/lib/security/input-sanitization";
export async function GET(request: NextRequest) {
  try {
    const { context, recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");
    if (!context.organizationId) {
      return NextResponse.json({ error: "Organisation membership is required" }, { status: 403 });
    }

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

    const [sessionResult, campaignResult] = await Promise.all([
      recruitment.listSessions(context.organizationId),
      recruitment.listCampaigns(context.organizationId),
    ]);
    const campaignNames = new Map(
      campaignResult.items.map((campaign) => [campaign.id, campaign.title]),
    );
    return NextResponse.json({
      data: sessionResult.items.map((item) =>
        toHiringManagerSession(
          item,
          campaignNames.get(item.campaignId) ?? "Campaign",
        ),
      ),
    });
  } catch (error) {
    return handleBffRouteError(error, "Sessions could not be loaded");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { context: actor, recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");

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

      const campaignWorkspace = await recruitment.getCampaign(campaignDocumentId);
      if (!["approved", "active"].includes(campaignWorkspace.campaign.status)) {
        return NextResponse.json(
          { error: "Campaign must be approved before sessions can be created." },
          { status: 409 }
        );
      }

      const operationPayload = {
        name,
        capacity: candidateLimit,
        startsAt:
          typeof startsAt === "string"
            ? new Date(startsAt).toISOString()
            : new Date().toISOString(),
        location: location || null,
        mode:
          requestedMode === "in_person" || requestedMode === "remote"
            ? requestedMode
            : campaignWorkspace.campaign.assessmentMode,
      };
      const operationKey = recruitmentIdempotencyKey(
        "session:create",
        actor.userId,
        { campaignDocumentId, ...operationPayload },
      );
      const accessCode = randomBytes(8).toString("base64url");
      const created = await recruitment.createSession(campaignDocumentId, {
        ...operationPayload,
        accessCode,
        idempotencyKey: operationKey,
      });
      const createdSession = await recruitment.getSession(created.sessionId);
      const dto = toHiringManagerSession(
        createdSession,
        campaignWorkspace.campaign.title,
      );
      const joinUrl = sessionJoinUrl(request, created.accessCode);
      return NextResponse.json(
        {
          data: {
            ...dto,
            accessValue: created.accessCode,
            joinUrl,
          },
        },
        { status: created.alreadyCreated ? 200 : 201 },
      );
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
