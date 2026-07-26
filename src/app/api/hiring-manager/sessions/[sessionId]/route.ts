import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
export async function DELETE(
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
      const current = await recruitment.getSession(sessionId);
      await recruitment.transitionSession(sessionId, {
        expectedVersion: current.version,
        status: "cancelled",
        idempotencyKey: recruitmentIdempotencyKey(
          "session:cancel",
          actor.userId,
          { sessionId, version: current.version },
        ),
      });
      return NextResponse.json({ data: { deleted: true } });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Session could not be deleted" },
        { status: 400 }
      );
    }
  } catch (error) {
    return handleBffRouteError(error, "Session could not be deleted");
  }
}
