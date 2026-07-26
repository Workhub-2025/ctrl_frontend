import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ candidateSessionId: string }> }
) {
  try {
    const { context: actor, recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { candidateSessionId } = await context.params;
    const session = await getServerSession(authOptions);
    const limiter = await applyRateLimit({
      key: `hm-candidate-unlock:post:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
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

    const current = await recruitment.getAssignment(candidateSessionId);
    if (current.assignment.status !== "locked" && current.assignment.status !== "active") {
      return NextResponse.json(
        { error: "Only locked candidates can be unlocked for attendance." },
        { status: 409 },
      );
    }

    const result = await recruitment.unlockAssignment(candidateSessionId, {
      idempotencyKey: recruitmentIdempotencyKey(
        "candidate-assignment:unlock",
        actor.userId,
        {
          candidateSessionId,
          version: current.assignment.version,
        },
      ),
    });

    return NextResponse.json({
      data: {
        unlocked: true,
        alreadyUnlocked: result.alreadyUnlocked,
        version: result.version,
      },
    });
  } catch (error) {
    return handleBffRouteError(error, "Candidate could not be unlocked");
  }
}
