import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { rejectCrossOriginRequest } from "@/lib/security/origin-guard";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import {
  sendSharedCandidateMessage,
  type ClientOutreachTemplateKey,
} from "@/services/client-portal.service";
import { requireClientSession, handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    await requireClientSession();

    const originRejected = rejectCrossOriginRequest(request);
    if (originRejected) {
      return originRejected;
    }

    const session = await getServerSession(authOptions);
    const limiter = await applyRateLimit({
      key: `client-outreach:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many messages sent. Please retry shortly." },
        { status: 429, headers: { "retry-after": String(limiter.retryAfterSeconds) } }
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

    const data = await sendSharedCandidateMessage(id, {
      subject: body.subject.trim(),
      body: body.body.trim(),
      templateKey: body.templateKey,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Message could not be sent");
  }
}
