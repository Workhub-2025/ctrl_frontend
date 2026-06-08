import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getStrapiClient } from "@/lib/strapi";
import {
  resolveCorrelationId,
  startServerActionTrace,
} from "@/lib/observability/server-observability";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";

type IncidentForm = {
  incidentType?: string;
  location?: string;
  callerName?: string;
  callbackNumber?: string;
  peopleInvolved?: string;
  injuriesRisk?: string;
  servicesRequired?: string;
  incidentSummary?: string;
};

type CallSnapshot = {
  runIndex: number;
  form: IncidentForm;
};

function scoreFormCompletion(form: IncidentForm) {
  const fields: Array<keyof IncidentForm> = [
    "incidentType",
    "location",
    "callerName",
    "callbackNumber",
    "peopleInvolved",
    "injuriesRisk",
    "servicesRequired",
    "incidentSummary",
  ];
  const completed = fields.filter((field) => String(form[field] ?? "").trim().length > 0).length;
  return Math.round((completed / fields.length) * 100);
}

function validatePayload(body: unknown):
  | {
      valid: true;
      snapshots: CallSnapshot[];
      startedAt: string;
      completedAt: string;
      candidateSessionDocumentId?: string | null;
    }
  | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const value = body as Record<string, unknown>;
  if (!Array.isArray(value.snapshots) || value.snapshots.length === 0) {
    return { valid: false, error: "snapshots must contain at least one call" };
  }

  if (typeof value.startedAt !== "string" || typeof value.completedAt !== "string") {
    return { valid: false, error: "startedAt and completedAt are required ISO strings" };
  }

  return {
    valid: true,
    snapshots: value.snapshots as CallSnapshot[],
    startedAt: value.startedAt,
    completedAt: value.completedAt,
    candidateSessionDocumentId:
      typeof value.candidateSessionDocumentId === "string"
        ? value.candidateSessionDocumentId
        : null,
  };
}

export async function POST(request: Request) {
  const correlationId = resolveCorrelationId(request.headers.get("x-correlation-id"));
  const trace = startServerActionTrace("callSimulationSubmit.post", { correlationId });

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
      key: `call-simulation-submit:${session.user.id}:${extractClientIp(request)}`,
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

    const finalSnapshot = validation.snapshots.at(-1);
    if (!finalSnapshot) {
      return NextResponse.json(
        { error: "A final call snapshot is required" },
        { status: 400, headers: { "x-correlation-id": correlationId } }
      );
    }

    const calls = [{
      runIndex: finalSnapshot.runIndex,
      durationSeconds: 0,
      fieldAccuracy: scoreFormCompletion(finalSnapshot.form),
      form: finalSnapshot.form,
    }];
    const practiceCalls = validation.snapshots.slice(0, -1).map((snapshot) => ({
      runIndex: snapshot.runIndex,
      durationSeconds: 0,
      fieldAccuracy: scoreFormCompletion(snapshot.form),
      form: snapshot.form,
    }));

    const strapiClient = getStrapiClient(session.user.jwt);
    const created = await strapiClient.fetch("/assessment/call-simulation/results", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startedAt: validation.startedAt,
        completedAt: validation.completedAt,
        candidateSessionDocumentId: validation.candidateSessionDocumentId,
        rawData: {
          assessmentType: "call-simulation",
          calls,
          practiceCalls,
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
    console.error("[call-simulation-submit] Unhandled error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please contact support." },
      { status: 500, headers: { "x-correlation-id": correlationId } }
    );
  }
}
