import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import { sessionJoinUrl } from "@/lib/public-app-urls";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";

/**
 * Reveal the session access code for an authenticated hiring manager.
 * List DTOs never include plaintext (codes are stored write-once encrypted);
 * this is the intentional share surface for both the code and the /join deep link.
 *
 * GET — no CSRF mutation guard; rate-limited + session:write on the domain API.
 * Never log the plaintext accessCode.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> },
) {
  try {
    const { session, recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");
    const limiter = await applyRateLimit({
      key: `hm-session-join:${session.user.id}:${extractClientIp(request)}`,
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
        accessCode: material.accessCode,
        joinUrl,
      },
    });
  } catch (error) {
    return handleBffRouteError(error, "Session join material could not be loaded");
  }
}
