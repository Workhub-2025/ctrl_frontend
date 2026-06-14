import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getStrapiClient } from "@/lib/strapi";
import {
  resolveCorrelationId,
  startServerActionTrace,
} from "@/lib/observability/server-observability";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";

type SjtResponse = {
  scenarioId: string;
  bestOptionId: string;
  worstOptionId: string;
};

function validatePayload(body: unknown):
  | { valid: true; responses: SjtResponse[]; startedAt: string; completedAt: string; candidateSessionDocumentId?: string | null; assessmentVersion?: string; difficulty?: string }
  | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const value = body as Record<string, unknown>;
  if (!Array.isArray(value.responses) || value.responses.length !== 20) {
    return { valid: false, error: "responses must contain 20 scenario responses" };
  }

  for (const response of value.responses) {
    if (!response || typeof response !== "object") {
      return { valid: false, error: "Each response must be an object" };
    }
    const item = response as Record<string, unknown>;
    if (
      typeof item.scenarioId !== "string" ||
      typeof item.bestOptionId !== "string" ||
      typeof item.worstOptionId !== "string"
    ) {
      return { valid: false, error: "Each response must include scenarioId, bestOptionId and worstOptionId" };
    }
    if (item.bestOptionId === item.worstOptionId) {
      return { valid: false, error: "Best and worst selections must be different" };
    }
  }

  if (typeof value.startedAt !== "string" || typeof value.completedAt !== "string") {
    return { valid: false, error: "startedAt and completedAt are required ISO strings" };
  }

  return {
    valid: true,
    responses: value.responses as SjtResponse[],
    startedAt: value.startedAt,
    completedAt: value.completedAt,
    candidateSessionDocumentId:
      typeof value.candidateSessionDocumentId === "string"
        ? value.candidateSessionDocumentId
        : null,
    assessmentVersion: typeof value.assessmentVersion === "string" ? value.assessmentVersion : undefined,
    difficulty: typeof value.difficulty === "string" ? value.difficulty : undefined,
  };
}

export async function POST(request: Request) {
  const correlationId = resolveCorrelationId(request.headers.get("x-correlation-id"));
  const trace = startServerActionTrace("sjtSubmit.post", { correlationId });

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
      key: `sjt-submit:${session.user.id}:${extractClientIp(request)}`,
      limit: 5,
      windowMs: 30_000,
    });
    if (!limiter.allowed) {
      trace.failure(new Error("Rate limit exceeded"), { limiter });
      return NextResponse.json(
        { error: "Too many submission attempts. Please wait before retrying." },
        {
          status: 429,
          headers: {
            "x-correlation-id": correlationId,
            "retry-after": String(limiter.retryAfterSeconds),
          },
        }
      );
    }

    const validation = validatePayload(await request.json());
    if (!validation.valid) {
      trace.failure(new Error(validation.error));
      return NextResponse.json(
        { error: validation.error },
        { status: 400, headers: { "x-correlation-id": correlationId } }
      );
    }

    const strapiClient = getStrapiClient(session.user.jwt);
    const created = await strapiClient.fetch("/assessment/situational-judgement/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startedAt: validation.startedAt,
        completedAt: validation.completedAt,
        candidateSessionDocumentId: validation.candidateSessionDocumentId,
        rawData: {
          assessmentType: "situational-judgement",
          assessmentVersion: validation.assessmentVersion,
          difficulty: validation.difficulty,
          responses: validation.responses,
        },
      }),
    });

    if (!created.ok) {
      const body = await created.json().catch(() => ({}));
      const message = (body as { error?: { message?: string }; message?: string })?.error?.message
        ?? (body as { message?: string })?.message
        ?? "Submission failed";
      trace.failure(new Error(message));
      return NextResponse.json(
        { error: message },
        { status: created.status, headers: { "x-correlation-id": correlationId } }
      );
    }

    const result = await created.json();
    trace.success({ userId: session.user.id });

    return NextResponse.json(
      {
        success: true,
        submitted: true,
        resultId: result?.data?.documentId ?? null,
      },
      { status: 201, headers: { "x-correlation-id": correlationId } }
    );
  } catch (error) {
    trace.failure(error);
    console.error("[sjt-submit] Unhandled error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please contact support." },
      { status: 500, headers: { "x-correlation-id": correlationId } }
    );
  }
}
