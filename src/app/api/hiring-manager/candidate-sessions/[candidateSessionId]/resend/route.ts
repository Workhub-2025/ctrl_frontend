import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { handleBffRouteError } from "@/lib/auth/bff-session";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ candidateSessionId: string }> }
) {
  try {
    const { session, context: actor, recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager", "admin");

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { candidateSessionId } = await context.params;
    const limiter = await applyRateLimit({
      key: `hm-candidate-resend:post:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
      limit: 10,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        { status: 429, headers: { "retry-after": String(limiter.retryAfterSeconds) } }
      );
    }

    const data = await recruitment.resendAssignmentInvitation(
      candidateSessionId,
      {
        idempotencyKey: recruitmentIdempotencyKey(
          "candidate-assignment:invitation-resend",
          actor.userId,
          {
            candidateSessionId,
            browserOperationId:
              request.headers.get("idempotency-key") ?? candidateSessionId,
          },
        ),
      },
    );
    return NextResponse.json({ data });
  } catch (error) {
    return handleBffRouteError(error, "Candidate invitation could not be resent");
  }
}
