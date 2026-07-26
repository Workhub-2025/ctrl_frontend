import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
export async function POST(
  request: NextRequest,
  context: { params: Promise<any> }
) {
  try {
    const { context: actor, recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

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

      const current = await recruitment.getAssignment(candidateSessionId);
      if (current.assignment.sessionId !== sessionId) {
        return NextResponse.json(
          { error: "Candidate assignment is not linked to this session" },
          { status: 409 },
        );
      }
      await recruitment.addNote(candidateSessionId, {
        visibility: "internal",
        content: `Candidate removed from session. Reason: ${reason}`,
        idempotencyKey: recruitmentIdempotencyKey(
          "candidate-assignment:removal-note",
          actor.userId,
          { sessionId, candidateSessionId, reason },
        ),
      });
      await recruitment.updateAssignment(candidateSessionId, {
        expectedVersion: current.assignment.version,
        status: "withdrawn",
        idempotencyKey: recruitmentIdempotencyKey(
          "candidate-assignment:withdraw",
          actor.userId,
          {
            sessionId,
            candidateSessionId,
            version: current.assignment.version,
          },
        ),
      });
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
  } catch (error) {
    return handleBffRouteError(error, "Candidate could not be removed");
  }
}
