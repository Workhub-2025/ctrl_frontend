import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { removeCandidateFromAssessmentSession } from "@/services/hiring-manager-campaigns.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  const session = await getServerSession(authOptions);
  const limiter = await applyRateLimit({
    key: `hm-session-remove:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!limiter.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please retry shortly." },
      { status: 429, headers: { "retry-after": String(limiter.retryAfterSeconds) } }
    );
  }

  try {
    const { sessionId, candidateSessionId } = await context.params;
    const body = await request.json();
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    if (reason.length < 3) {
      return NextResponse.json({ error: "Removal reason is required" }, { status: 400 });
    }

    await removeCandidateFromAssessmentSession(sessionId, candidateSessionId, reason);
    return NextResponse.json({ data: { removed: true } });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Candidate could not be removed",
      },
      { status: 500 }
    );
  }
}
