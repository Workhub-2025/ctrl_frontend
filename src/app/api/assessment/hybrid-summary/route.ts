import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { HybridAssessmentSummarySchema } from "@/types";
import {
  resolveCorrelationId,
  startServerActionTrace,
} from "@/lib/observability/server-observability";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";

export async function POST(request: NextRequest) {
  const correlationId = resolveCorrelationId(request.headers.get("x-correlation-id"));
  const trace = startServerActionTrace("hybridSummary.post", { correlationId });

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.jwt) {
      trace.failure(new Error("Unauthorized"));
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "x-correlation-id": correlationId } }
      );
    }

    const limiter = await applyRateLimit({
      key: `hybrid-summary:post:${session.user.id}:${extractClientIp(request)}`,
      limit: 12,
      windowMs: 60_000,
    });
    if (!limiter.allowed) {
      trace.failure(new Error("Rate limit exceeded"), { limiter });
      return NextResponse.json(
        { error: "Too many summary submissions. Please retry shortly." },
        {
          status: 429,
          headers: {
            "x-correlation-id": correlationId,
            "retry-after": String(limiter.retryAfterSeconds),
          },
        }
      );
    }

    const body = await request.json();
    const parsed = HybridAssessmentSummarySchema.safeParse(body);
    if (!parsed.success) {
      trace.failure(new Error("Invalid payload"), {
        issues: parsed.error.issues.map((i) => i.message).join(", "),
      });
      return NextResponse.json(
        { error: "Invalid summary payload" },
        { status: 400, headers: { "x-correlation-id": correlationId } }
      );
    }

    const summary = parsed.data;

    // Persist core score fields to user profile.
    const { fetchClient } = await import("@/lib/fetch-client");
    const updateResponse = await fetchClient(`/users/${session.user.id}`, {
      method: "PUT",
      body: JSON.stringify({
        overallScore: summary.overallScore,
        progresStatus: "Completed",
      }),
      headers: {
        Authorization: `Bearer ${session.user.jwt}`,
        "Content-Type": "application/json",
      },
    });

    let userUpdated = updateResponse.ok;
    if (!updateResponse.ok) {
      userUpdated = false;
    }

    // Optional external persistence for full evidence object.
    const webhook = process.env.HYBRID_ASSESSMENT_WEBHOOK_URL;
    let webhookSent = false;
    if (webhook) {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session.user.id,
          organization: session.user.organization ?? null,
          summary,
          correlationId,
          recordedAt: new Date().toISOString(),
        }),
      });
      webhookSent = true;
    }

    console.info(
      "[HYBRID_SUMMARY]",
      JSON.stringify({
        correlationId,
        userId: session.user.id,
        overallScore: summary.overallScore,
        readinessBand: summary.readinessBand,
        outcomes: summary.outcomes.length,
      })
    );

    trace.success({
      userId: session.user.id,
      overallScore: summary.overallScore,
      userUpdated,
      webhookSent,
    });

    return NextResponse.json(
      {
        success: true,
        persisted: {
          userUpdated,
          webhookSent,
        },
      },
      { status: 200, headers: { "x-correlation-id": correlationId } }
    );
  } catch (error) {
    trace.failure(error);
    return NextResponse.json(
      { error: "Failed to persist hybrid assessment summary" },
      { status: 500, headers: { "x-correlation-id": correlationId } }
    );
  }
}
