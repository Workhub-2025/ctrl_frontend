import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import { sessionJoinUrl } from "@/lib/public-app-urls";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");
    const session = await getServerSession(authOptions);
    const limiter = await applyRateLimit({
      key: `hm-session-join:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        {
          status: 429,
          headers: { "retry-after": String(limiter.retryAfterSeconds) },
        },
      );
    }

    const { sessionId } = await context.params;
    const material = await recruitment.revealSessionAccessCode(sessionId);
    const joinUrl = sessionJoinUrl(request, material.accessCode);
    return NextResponse.json({
      data: {
        joinUrl,
        /** Plaintext is intentionally omitted after first create; join URL is the share surface. */
        accessCodeShownOnce: true,
        message:
          "The access code is only shown when the session is created. Copy the join link to share access.",
      },
    });
  } catch (error) {
    return handleBffRouteError(error, "Session join link could not be loaded");
  }
}
