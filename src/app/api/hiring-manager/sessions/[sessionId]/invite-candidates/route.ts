import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { recruitmentIdempotencyKey } from "@/lib/firebase-recruitment-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { session, context: actor, recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const limiter = await applyRateLimit({
      key: `hm-session-invite:${session.user.id}:${extractClientIp(request)}`,
      limit: 8,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        { status: 429, headers: { "retry-after": String(limiter.retryAfterSeconds) } }
      );
    }

    try {
      const { sessionId } = await context.params;
      const body = await request.json().catch(() => ({}));
      const emails: string[] = Array.isArray(body?.emails)
        ? body.emails.filter((value: unknown) => typeof value === "string")
        : [];

      if (emails.length === 0) {
        return NextResponse.json({ error: "At least one email is required" }, { status: 400 });
      }

      const assessmentSession = await recruitment.getSession(sessionId);
      const uniqueEmails = [
        ...new Set(emails.map((email) => email.trim().toLowerCase())),
      ];
      const browserOperationId =
        request.headers.get("idempotency-key")?.trim() || crypto.randomUUID();

      const settled = await Promise.allSettled(
        uniqueEmails.map(async (email) => {
          const inviteKey = recruitmentIdempotencyKey(
            "candidate-assignment:invite",
            actor.userId,
            { sessionId, email, browserOperationId },
          );
          const created = await recruitment.createAssignment(
            assessmentSession.campaignId,
            {
              sessionId,
              candidateUserId: null,
              inviteEmail: email,
              idempotencyKey: inviteKey,
            },
          );

          // Re-invite of an existing pending assignment must rotate+requeue
          // delivery. createAssignment is identity-idempotent and otherwise
          // returns alreadyCreated without writing a new outbox event.
          if (created.alreadyCreated) {
            await recruitment.resendAssignmentInvitation(created.assignmentId, {
              idempotencyKey: recruitmentIdempotencyKey(
                "candidate-assignment:invitation-resend",
                actor.userId,
                { assignmentId: created.assignmentId, browserOperationId },
              ),
            });
          }

          return { email, assignmentId: created.assignmentId };
        }),
      );

      const queued = settled.flatMap((item) =>
        item.status === "fulfilled" ? [item.value.email] : [],
      );
      const failed = settled.flatMap((item, index) =>
        item.status === "rejected"
          ? [
              uniqueEmails[index] +
                ": " +
                (item.reason instanceof Error
                  ? item.reason.message
                  : "Invitation could not be created"),
            ]
          : [],
      );

      if (queued.length === 0) {
        return NextResponse.json(
          {
            error:
              failed[0] ||
              "Candidate invites could not be queued",
            data: { sent: [], failed, queued: false },
          },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          data: {
            // "sent" kept for older clients; delivery is outbox/SMTP async.
            sent: queued,
            failed,
            queued: true,
            delivery: "queued" as const,
            sessions: settled.flatMap((item) =>
              item.status === "fulfilled"
                ? [{ documentId: item.value.assignmentId, email: item.value.email }]
                : [],
            ),
          },
        },
        { status: 201 },
      );
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Candidate invites could not be sent",
        },
        { status: 400 },
      );
    }
  } catch (error) {
    return handleBffRouteError(error, "Candidates could not be invited");
  }
}
