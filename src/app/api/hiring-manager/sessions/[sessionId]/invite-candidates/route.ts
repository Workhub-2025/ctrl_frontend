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
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { context: actor, recruitment } =
      await requireFirebaseRecruitmentSession("hiring_manager");

    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const session = await getServerSession(authOptions);
    const limiter = await applyRateLimit({
      key: `hm-session-invite:${session?.user?.id ?? "anonymous"}:${extractClientIp(request)}`,
      limit: 8,
      windowMs: 60_000,
    });

    if (!limiter.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please retry shortly." },
        { status: 429, headers: { "retry-after": String(limiter.retryAfterSeconds) } }
      );
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
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
      const settled = await Promise.allSettled(
        uniqueEmails.map(async (email) => {
          const created = await recruitment.createAssignment(
            assessmentSession.campaignId,
            {
              sessionId,
              candidateUserId: null,
              inviteEmail: email,
              idempotencyKey: recruitmentIdempotencyKey(
                "candidate-assignment:invite",
                actor.userId,
                { sessionId, email },
              ),
            },
          );
          return { email, assignmentId: created.assignmentId };
        }),
      );
      const sent = settled.flatMap((item) =>
        item.status === "fulfilled" ? [item.value.email] : [],
      );
      const failed = settled.flatMap((item, index) =>
        item.status === "rejected"
          ? [
              {
                email: uniqueEmails[index],
                error:
                  item.reason instanceof Error
                    ? item.reason.message
                    : "Invitation could not be created",
              },
            ]
          : [],
      );
      const result = {
        sent,
        failed,
        sessions: settled.flatMap((item) =>
          item.status === "fulfilled"
            ? [{ documentId: item.value.assignmentId, email: item.value.email }]
            : [],
        ),
      };
      return NextResponse.json({ data: result }, { status: 201 });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Candidate invites could not be sent",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    return handleBffRouteError(error, "Candidates could not be invited");
  }
}
