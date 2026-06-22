import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { recordIntegrityEventViaBuffer } from "@/lib/security/integrity-event-buffer";

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

    const result = await recordIntegrityEventViaBuffer({
      strapiJwt,
      userId: session.user.id,
      role: session.user.role ?? "candidate",
      organization: session.user.organization ?? null,
      clientIp,
      userAgent: request.headers.get("user-agent") ?? "unknown",
      payload,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Integrity event failed" },
      { status: 500 }
    );
  }
}
