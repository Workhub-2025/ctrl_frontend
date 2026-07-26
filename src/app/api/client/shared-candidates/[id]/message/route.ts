import { NextRequest, NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { createFirebaseClientPortalApi } from "@/lib/firebase-client-portal-api";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import type { ClientOutreachTemplateKey } from "@/services/client-portal.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const originRejected = rejectCrossOriginRequest(request);
    if (originRejected) {
      return originRejected;
    }

    const auth = await requireFirebaseRecruitmentSession("client");
    const limiter = await applyRateLimit({
      key: `client-outreach:${auth.context.userId}:${extractClientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many messages sent. Please retry shortly." },
        {
          status: 429,
          headers: { "retry-after": String(limiter.retryAfterSeconds) },
        },
      );
    }

    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as {
      subject?: string;
      body?: string;
      templateKey?: ClientOutreachTemplateKey;
    };

    if (!body.subject?.trim()) {
      return NextResponse.json({ error: "subject is required" }, { status: 400 });
    }
    if (!body.body?.trim()) {
      return NextResponse.json({ error: "body is required" }, { status: 400 });
    }

    const portal = createFirebaseClientPortalApi(
      auth.domainApi,
      auth.firebaseSessionCookie,
    );
    const data = await portal.sendOutreachMessage(id, {
      subject: body.subject.trim(),
      body: body.body.trim(),
      templateKey: body.templateKey,
      idempotencyKey: recruitmentIdempotencyKey(
        "assignment:outreach",
        auth.context.userId,
        {
          assignmentId: id,
          subject: body.subject.trim(),
          body: body.body.trim(),
          templateKey: body.templateKey ?? null,
        },
      ),
    });

    return NextResponse.json({
      data: { sent: data.sent, failed: data.failed },
    });
  } catch (error) {
    return handleBffRouteError(error, "Message could not be sent");
  }
}
