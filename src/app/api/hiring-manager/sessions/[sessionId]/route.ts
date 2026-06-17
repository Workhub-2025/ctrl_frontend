import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { deleteHiringManagerAssessmentSession } from "@/services/hiring-manager-campaigns.service";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await context.params;
  const session = await getServerSession(authOptions);
  const limiter = await applyRateLimit({
    key: `hm-session-delete:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
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

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    await deleteHiringManagerAssessmentSession(sessionId);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Session could not be deleted" },
      { status: 400 }
    );
  }
}
