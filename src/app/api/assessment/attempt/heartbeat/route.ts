import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { forwardAssessmentAttemptRequest } from "@/lib/assessment-attempt-server";
import {
  applyAssessmentAttemptRateLimit,
  parseAttemptIdentifiers,
} from "@/lib/security/assessment-attempt-rate-limit";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const strapiJwt = await getServerStrapiJwt(request);
    if (!session?.user?.id || !strapiJwt) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const payload = await request.json().catch(() => ({}));
    const attempt = parseAttemptIdentifiers(payload);
    if (!attempt) {
      return NextResponse.json(
        { error: "candidateSessionDocumentId and assessmentSlug are required" },
        { status: 400 }
      );
    }

    const limiter = await applyAssessmentAttemptRateLimit({
      kind: "heartbeat",
      userId: session.user.id,
      ...attempt,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Heartbeat rate limit exceeded for this attempt." },
        {
          status: 429,
          headers: { "retry-after": String(limiter.retryAfterSeconds) },
        }
      );
    }

    const { response, body } = await forwardAssessmentAttemptRequest(
      "/candidate-assessment-attempts/heartbeat",
      { method: "POST", body: JSON.stringify(payload) },
      strapiJwt
    );

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Heartbeat failed" },
      { status: 500 }
    );
  }
}
