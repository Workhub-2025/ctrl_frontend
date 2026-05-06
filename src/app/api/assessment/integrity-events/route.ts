import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveCorrelationId, startServerActionTrace } from "@/lib/observability/server-observability";
import { applyRateLimit, extractClientIp } from "@/lib/security/api-rate-limit";

export type IntegrityEventType =
  | "assessment_started"
  | "assessment_completed"
  | "window_blur"
  | "window_focus"
  | "tab_hidden"
  | "tab_visible"
  | "copy_attempt"
  | "paste_attempt"
  | "context_menu_attempt"
  | "heartbeat";

interface IntegrityEventPayload {
  assessmentType: string;
  eventType: IntegrityEventType;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
}

export async function POST(request: Request) {
  const correlationId = resolveCorrelationId(
    request.headers.get("x-correlation-id")
  );
  const trace = startServerActionTrace("integrityEvents.post", { correlationId });
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      trace.failure(new Error("Unauthorized"));
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "x-correlation-id": correlationId } }
      );
    }

    const clientIp = extractClientIp(request);
    const limiter = await applyRateLimit({
      key: `integrity:${session.user.id}:${clientIp}`,
      limit: 120,
      windowMs: 60_000,
    });
    if (!limiter.allowed) {
      trace.failure(new Error("Rate limit exceeded"), { limiter });
      return NextResponse.json(
        { error: "Too many integrity events. Please retry shortly." },
        {
          status: 429,
          headers: {
            "x-correlation-id": correlationId,
            "retry-after": String(limiter.retryAfterSeconds),
          },
        }
      );
    }

    const body = (await request.json()) as IntegrityEventPayload;
    if (!body?.assessmentType || !body?.eventType) {
      trace.failure(new Error("Missing required integrity event fields"));
      return NextResponse.json(
        { error: "assessmentType and eventType are required" },
        { status: 400, headers: { "x-correlation-id": correlationId } }
      );
    }

    const envelope = {
      userId: session.user.id,
      role: session.user.role ?? "candidate",
      organization: session.user.organization ?? null,
      assessmentType: body.assessmentType,
      eventType: body.eventType,
      metadata: body.metadata ?? {},
      occurredAt: body.occurredAt ?? new Date().toISOString(),
      recordedAt: new Date().toISOString(),
      ipAddress: clientIp,
      userAgent: request.headers.get("user-agent") ?? "unknown",
      correlationId,
    };

    const webhook = process.env.INTEGRITY_EVENTS_WEBHOOK_URL;
    if (webhook) {
      await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope),
      });
    }

    // Always record locally for immediate audit visibility.
    console.info("[INTEGRITY_EVENT]", JSON.stringify(envelope));

    // Persist to Strapi (non-blocking — failure must not affect the response).
    try {
      const { getStrapiClient } = await import("@/lib/strapi");
      const strapiClient = getStrapiClient(session.user.jwt); // User JWT — integrity-events require authenticated role
      await strapiClient.collection("integrity-events").create({
        users_permissions_user: String(session.user.id),
        assessmentType: body.assessmentType,
        eventType: body.eventType,
        metadata: body.metadata ?? {},
        occurredAt: body.occurredAt ?? new Date().toISOString(),
        ipAddress: clientIp,
        userAgent: request.headers.get("user-agent") ?? "unknown",
        correlationId,
      } as Record<string, unknown>);
    } catch (persistError) {
      console.warn("[INTEGRITY_EVENT] Strapi persistence failed (non-fatal):", persistError);
    }

    trace.success({ eventType: body.eventType, assessmentType: body.assessmentType });
    return NextResponse.json(
      { success: true, recorded: true },
      { status: 200, headers: { "x-correlation-id": correlationId } }
    );
  } catch (error) {
    trace.failure(error);
    console.error("[INTEGRITY_EVENT] Failed to record integrity event:", error);
    return NextResponse.json(
      { error: "Failed to record integrity event" },
      { status: 500, headers: { "x-correlation-id": correlationId } }
    );
  }
}
