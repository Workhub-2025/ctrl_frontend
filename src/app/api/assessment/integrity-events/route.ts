import { NextResponse } from "next/server";

import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import {
  resolveCorrelationId,
  startServerActionTrace,
} from "@/lib/observability/server-observability";
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
  | "fullscreen_exit"
  | "heartbeat";

type FirebaseIntegrityEventType =
  | "clipboard_copy"
  | "clipboard_cut"
  | "clipboard_paste"
  | "context_menu"
  | "tab_hidden"
  | "focus_lost"
  | "fullscreen_exit"
  | "heartbeat"
  | "heartbeat_timeout"
  | "network_disconnect"
  | "other";

interface IntegrityEventPayload {
  attemptId?: string;
  assessmentType?: string;
  eventType: IntegrityEventType | FirebaseIntegrityEventType;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
  durationMs?: number;
  stageId?: string;
  correlationId?: string;
}

const LEGACY_EVENT_MAP: Record<string, FirebaseIntegrityEventType> = {
  assessment_started: "other",
  assessment_completed: "other",
  window_blur: "focus_lost",
  window_focus: "other",
  tab_hidden: "tab_hidden",
  tab_visible: "other",
  copy_attempt: "clipboard_copy",
  paste_attempt: "clipboard_paste",
  context_menu_attempt: "context_menu",
  fullscreen_exit: "fullscreen_exit",
  heartbeat: "heartbeat",
  clipboard_copy: "clipboard_copy",
  clipboard_cut: "clipboard_cut",
  clipboard_paste: "clipboard_paste",
  context_menu: "context_menu",
  focus_lost: "focus_lost",
  heartbeat_timeout: "heartbeat_timeout",
  network_disconnect: "network_disconnect",
  other: "other",
};

function mapIntegrityEventType(
  eventType: string,
): FirebaseIntegrityEventType | null {
  return LEGACY_EVENT_MAP[eventType] ?? null;
}

/**
 * Legacy integrity ingest. Prefer AssessmentRuntimeClient.event on the
 * attempt path; this route only remains as an adapter that writes to the
 * Firebase attempt integrity subcollection (never Strapi).
 */
export async function POST(request: Request) {
  const correlationId = resolveCorrelationId(
    request.headers.get("x-correlation-id"),
  );
  const trace = startServerActionTrace("integrityEvents.post", { correlationId });

  try {
    const auth = await requireFirebaseSession();
    const clientIp = extractClientIp(request);
    const limiter = await applyRateLimit({
      key: `integrity:${auth.session.user.id}:${clientIp}`,
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
        },
      );
    }

    const body = (await request.json()) as IntegrityEventPayload;
    const attemptId =
      typeof body.attemptId === "string" ? body.attemptId.trim() : "";
    if (!attemptId) {
      trace.failure(new Error("Missing attemptId"));
      return NextResponse.json(
        {
          error:
            "attemptId is required. Record integrity events on the assessment-runtime attempt path.",
        },
        { status: 400, headers: { "x-correlation-id": correlationId } },
      );
    }

    if (!body?.eventType) {
      trace.failure(new Error("Missing eventType"));
      return NextResponse.json(
        { error: "eventType is required" },
        { status: 400, headers: { "x-correlation-id": correlationId } },
      );
    }

    const mappedType = mapIntegrityEventType(body.eventType);
    if (!mappedType) {
      trace.failure(new Error("Unsupported integrity event type"));
      return NextResponse.json(
        { error: "Unsupported integrity event type" },
        { status: 400, headers: { "x-correlation-id": correlationId } },
      );
    }

    await auth.domainApi.request({
      path: `/v1/assessment-runtime/attempts/${encodeURIComponent(attemptId)}/events`,
      firebaseSessionCookie: auth.firebaseSessionCookie,
      method: "POST",
      body: {
        type: mappedType,
        occurredAt: body.occurredAt ?? new Date().toISOString(),
        correlationId: body.correlationId ?? correlationId,
        ...(typeof body.durationMs === "number"
          ? { durationMs: body.durationMs }
          : {}),
        ...(typeof body.stageId === "string" ? { stageId: body.stageId } : {}),
      },
    });

    trace.success({
      eventType: mappedType,
      assessmentType: body.assessmentType ?? null,
      attemptId,
    });
    return NextResponse.json(
      { success: true, recorded: true },
      { status: 200, headers: { "x-correlation-id": correlationId } },
    );
  } catch (error) {
    trace.failure(error);
    return handleBffRouteError(error, "Failed to record integrity event");
  }
}
