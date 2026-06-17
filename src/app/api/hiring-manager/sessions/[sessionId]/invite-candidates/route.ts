import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { inviteCandidatesToSession } from "@/services/hiring-manager-campaigns.service";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const session = await getServerSession(authOptions);
  const limiter = await applyRateLimit({
    key: `hm-session-invite:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
    limit: 8,
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
    const { sessionId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const emails = Array.isArray(body?.emails)
      ? body.emails.filter((value: unknown) => typeof value === "string")
      : [];

    if (emails.length === 0) {
      return NextResponse.json({ error: "At least one email is required" }, { status: 400 });
    }

    const result = await inviteCandidatesToSession(sessionId, emails);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Candidate invites could not be sent",
      },
      { status: 400 }
    );
  }
}
