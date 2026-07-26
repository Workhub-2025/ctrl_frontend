import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { invalidateHmReportServerCache } from "@/lib/portal-cache-invalidation";
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
      key: `hm-candidate-decision:post:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
      limit: 20,
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

    let body: { decision?: string; note?: string } = {};
    try {
      body = (await request.json()) as { decision?: string; note?: string };
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!body.decision || !["approve", "reject"].includes(body.decision)) {
      return NextResponse.json(
        { error: "decision must be approve or reject" },
        { status: 400 }
      );
    }

    const rationale = body.note?.trim() || `Hiring manager decision: ${body.decision}`;
    const decision = body.decision === "approve" ? "progress" : "reject";
    const result = await recruitment.addDecision(candidateSessionId, {
      decision,
      rationale,
      idempotencyKey: recruitmentIdempotencyKey(
        "candidate-assignment:hm-decision",
        actor.userId,
        {
          candidateSessionId,
          decision,
          rationale,
          browserOperationId:
            request.headers.get("idempotency-key") ?? candidateSessionId,
        },
      ),
    });
    void invalidateHmReportServerCache(session.user.id, candidateSessionId);
    return NextResponse.json({
      data: {
        documentId: result.decisionId,
        decision: body.decision,
        hmDecision: body.decision === "approve" ? "approved" : "rejected",
        note: rationale,
      },
    });
  } catch (error) {
    return handleBffRouteError(error, "Decision could not be recorded");
  }
}
