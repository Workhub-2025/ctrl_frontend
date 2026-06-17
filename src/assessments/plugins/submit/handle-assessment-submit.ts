import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import {
  resolveCorrelationId,
  startServerActionTrace,
} from "@/lib/observability/server-observability";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";
import { getStrapiClient } from "@/lib/strapi";
import { getAssessmentSubmitHandler } from "./registry";

export async function handleAssessmentSubmit(slug: string, request: Request) {
  const handler = getAssessmentSubmitHandler(slug);
  if (!handler) {
    return NextResponse.json({ error: "Unknown assessment type" }, { status: 404 });
  }

  const correlationId = resolveCorrelationId(request.headers.get("x-correlation-id"));
  const trace = startServerActionTrace(handler.traceAction, { correlationId });

  try {
    const session = await getServerSession(authOptions);
    const strapiJwt = await getServerStrapiJwt(request);
    if (!session?.user?.id || !strapiJwt) {
      trace.failure(new Error("Unauthorized"));
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "x-correlation-id": correlationId } },
      );
    }

    const clientIp = extractClientIp(request);
    const limiter = await applyRateLimit({
      key: `${slug}-submit:${session.user.id}:${clientIp}`,
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
        },
      );
    }

    const validation = handler.validate(await request.json());
    if (!validation.valid) {
      trace.failure(new Error(validation.error));
      return NextResponse.json(
        { error: validation.error },
        { status: 400, headers: { "x-correlation-id": correlationId } },
      );
    }

    const strapiClient = getStrapiClient(strapiJwt);
    const created = await strapiClient.fetch(handler.strapiResultsPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(handler.buildStrapiBody(validation.data)),
    });

    if (!created.ok) {
      const body = await created.json().catch(() => ({}));
      const message =
        (body as { error?: { message?: string }; message?: string })?.error?.message ??
        (body as { message?: string })?.message ??
        "Submission failed";
      trace.failure(new Error(message));
      return NextResponse.json(
        { error: message },
        { status: created.status, headers: { "x-correlation-id": correlationId } },
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
      { status: 201, headers: { "x-correlation-id": correlationId } },
    );
  } catch (error) {
    if (
      handler.idempotentConflict &&
      error instanceof Error &&
      error.message.includes("409")
    ) {
      trace.failure(error, { reason: "already_submitted" });
      return NextResponse.json(
        { error: "Assessment already submitted", alreadySubmitted: true },
        { status: 409, headers: { "x-correlation-id": correlationId } },
      );
    }

    trace.failure(error);
    console.error(`[${slug}-submit] Unhandled error:`, error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please contact support." },
      { status: 500, headers: { "x-correlation-id": correlationId } },
    );
  }
}
