import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { forwardAssessmentAttemptRequest } from "@/lib/assessment-attempt-server";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const strapiJwt = await getServerStrapiJwt(request);
    if (!session?.user?.id || !strapiJwt) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const clientIp = extractClientIp(request);
    const limiter = await applyRateLimit({
      key: `integrity:${session.user.id}:${clientIp}`,
      limit: 120,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many integrity events. Please retry shortly." },
        {
          status: 429,
          headers: { "retry-after": String(limiter.retryAfterSeconds) },
        }
      );
    }

    const payload = await request.json().catch(() => ({}));
    const { candidateSessionDocumentId, assessmentSlug, eventType } = payload as {
      candidateSessionDocumentId?: string;
      assessmentSlug?: string;
      eventType?: string;
    };

    if (!candidateSessionDocumentId || !assessmentSlug || !eventType) {
      return NextResponse.json(
        {
          error:
            "candidateSessionDocumentId, assessmentSlug, and eventType are required",
        },
        { status: 400 }
      );
    }

    const webhook = process.env.INTEGRITY_EVENTS_WEBHOOK_URL;
    if (webhook) {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          role: session.user.role ?? "candidate",
          organization: session.user.organization ?? null,
          assessmentType: assessmentSlug,
          eventType,
          metadata: payload.metadata ?? {},
          occurredAt: payload.occurredAt ?? new Date().toISOString(),
          ipAddress: clientIp,
          userAgent: request.headers.get("user-agent") ?? "unknown",
        }),
      });
    }

    const { response, body } = await forwardAssessmentAttemptRequest(
      "/candidate-assessment-attempts/integrity-event",
      {
        method: "POST",
        body: JSON.stringify({
          ...payload,
          ipAddress: clientIp,
          userAgent: request.headers.get("user-agent") ?? "unknown",
        }),
      },
      strapiJwt
    );

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Integrity event failed" },
      { status: 500 }
    );
  }
}
