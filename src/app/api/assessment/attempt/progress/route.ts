import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { forwardAssessmentAttemptRequest } from "@/lib/assessment-attempt-server";
import {
  applyAssessmentAttemptRateLimit,
  parseAttemptIdentifiers,
} from "@/lib/security/assessment-attempt-rate-limit";

async function requireAttemptAuth(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const strapiJwt = await getServerStrapiJwt(request);
  if (!session?.user?.id || !strapiJwt) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  return { ok: true as const, strapiJwt, userId: session.user.id };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAttemptAuth(request);
    if (!auth.ok) return auth.response;

    const query = request.nextUrl.searchParams.toString();
    const { response, body } = await forwardAssessmentAttemptRequest(
      `/candidate-assessment-attempts/progress${query ? `?${query}` : ""}`,
      { method: "GET" },
      auth.strapiJwt
    );

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Progress could not be loaded" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAttemptAuth(request);
    if (!auth.ok) return auth.response;

    const payload = await request.json().catch(() => ({}));
    const attempt = parseAttemptIdentifiers(payload);
    if (!attempt) {
      return NextResponse.json(
        { error: "candidateSessionDocumentId and assessmentSlug are required" },
        { status: 400 }
      );
    }

    const limiter = await applyAssessmentAttemptRateLimit({
      kind: "progress",
      userId: auth.userId,
      ...attempt,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Progress save rate limit exceeded for this attempt." },
        {
          status: 429,
          headers: { "retry-after": String(limiter.retryAfterSeconds) },
        }
      );
    }

    const { response, body } = await forwardAssessmentAttemptRequest(
      "/candidate-assessment-attempts/progress",
      { method: "POST", body: JSON.stringify(payload) },
      auth.strapiJwt
    );

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Progress could not be saved" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAttemptAuth(request);
    if (!auth.ok) return auth.response;

    const query = request.nextUrl.searchParams.toString();
    const { response, body } = await forwardAssessmentAttemptRequest(
      `/candidate-assessment-attempts/progress${query ? `?${query}` : ""}`,
      { method: "DELETE" },
      auth.strapiJwt
    );

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Progress could not be cleared" },
      { status: 500 }
    );
  }
}
