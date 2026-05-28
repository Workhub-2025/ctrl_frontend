import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
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
    const { getStrapiClient } = await import("@/lib/strapi");
    const strapiClient = getStrapiClient(session.user.jwt);
    let userUpdated = false;
    try {
      await strapiClient.collection("users").update(String(session.user.id), {
        overallScore: summary.overallScore,
        progresStatus: "Completed",
      });
      userUpdated = true;
      await strapiClient.collection('candidate-reports').create({
        users_permissions_user: String(session.user.id),
        reportData: summary,
        overallScore: summary.overallScore,
        passed: summary.readinessBand !== 'developing',
        generatedAt: new Date().toISOString(),
      });
    } catch (updateError) {
      trace.failure(updateError instanceof Error ? updateError : new Error("User update failed"));
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
