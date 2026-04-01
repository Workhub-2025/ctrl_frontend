import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

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

const getClientAddress = (request: Request) => {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as IntegrityEventPayload;
    if (!body?.assessmentType || !body?.eventType) {
      return NextResponse.json(
        { error: "assessmentType and eventType are required" },
        { status: 400 }
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
      ipAddress: getClientAddress(request),
      userAgent: request.headers.get("user-agent") ?? "unknown",
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

    return NextResponse.json({ success: true, recorded: true }, { status: 200 });
  } catch (error) {
    console.error("[INTEGRITY_EVENT] Failed to record integrity event:", error);
    return NextResponse.json(
      { error: "Failed to record integrity event" },
      { status: 500 }
    );
  }
}

