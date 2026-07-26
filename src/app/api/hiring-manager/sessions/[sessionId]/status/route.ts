import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { invalidateHmOverviewServerCache } from "@/lib/portal-cache-invalidation";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { context: actor, recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { sessionId } = await context.params;
    const session = await getServerSession(authOptions);
    const limiter = await applyRateLimit({
      key: `hm-session-status:post:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
      limit: 15,
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
      const body = await request.json();
      const { status } = body as { status?: "closed" };

      if (status !== "closed") {
        return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
      }

      const current = await recruitment.getSession(sessionId);
      const data = await recruitment.transitionSession(sessionId, {
        status: "closed",
        expectedVersion: current.version,
        idempotencyKey: recruitmentIdempotencyKey(
          "session:close",
          actor.userId,
          { sessionId, version: current.version },
        ),
      });
      void invalidateHmOverviewServerCache();
      return NextResponse.json({ data });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Internal Server Error" },
        { status: 500 }
      );
    }
  } catch (error) {
    return handleBffRouteError(error, "Session status could not be updated");
  }
}
