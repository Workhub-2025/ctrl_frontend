import "server-only";

import { forwardAssessmentAttemptRequest } from "@/lib/assessment-attempt-server";
import {
  isUpstashConfigured,
  upstashDel,
  upstashGetJson,
  upstashLlen,
  upstashLpush,
  upstashLrange,
  upstashPexpire,
  upstashSetJson,
} from "@/lib/security/upstash-rest";

const BUFFER_MAX_EVENTS = 8;
const BUFFER_FLUSH_MS = 3_000;
const BUFFER_TTL_MS = 5 * 60_000;

const IMMEDIATE_FLUSH_EVENT_TYPES = new Set(["assessment_completed"]);

type BufferMeta = { oldestAt: string };

type SerializedBufferedEvent = {
  payload: Record<string, unknown>;
  clientIp: string;
  userAgent: string;
};

export type IntegrityEventIngress = {
  strapiJwt: string;
  userId: string;
  role: string;
  organization: string | null;
  clientIp: string;
  userAgent: string;
  payload: Record<string, unknown>;
};

function bufferKeys(userId: string, candidateSessionDocumentId: string, assessmentSlug: string) {
  const attemptKey = `${userId}:${candidateSessionDocumentId}:${assessmentSlug}`;
  return {
    listKey: `integrity:buffer:${attemptKey}`,
    metaKey: `integrity:buffer:meta:${attemptKey}`,
  };
}

async function postIntegrityWebhook(
  webhookUrl: string,
  event: IntegrityEventIngress,
  payload: Record<string, unknown>
): Promise<void> {
  const { assessmentSlug, eventType, metadata, occurredAt } = payload as {
    assessmentSlug?: string;
    eventType?: string;
    metadata?: Record<string, unknown>;
    occurredAt?: string;
  };

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: event.userId,
      role: event.role,
      organization: event.organization,
      assessmentType: assessmentSlug,
      eventType,
      metadata: metadata ?? {},
      occurredAt: occurredAt ?? new Date().toISOString(),
      ipAddress: event.clientIp,
      userAgent: event.userAgent,
    }),
  });
}

async function forwardSingleIntegrityEvent(
  event: IntegrityEventIngress,
  payload: Record<string, unknown>
): Promise<{ status: number; body: unknown }> {
  const webhook = process.env.INTEGRITY_EVENTS_WEBHOOK_URL;
  if (webhook) {
    await postIntegrityWebhook(webhook, event, payload);
  }

  const { response, body } = await forwardAssessmentAttemptRequest(
    "/candidate-assessment-attempts/integrity-event",
    {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        ipAddress: event.clientIp,
        userAgent: event.userAgent,
      }),
    },
    event.strapiJwt
  );

  return { status: response.status, body };
}

function shouldFlushBuffer(meta: BufferMeta | null, bufferLength: number): boolean {
  if (bufferLength <= 0) {
    return false;
  }
  if (bufferLength >= BUFFER_MAX_EVENTS) {
    return true;
  }
  if (!meta?.oldestAt) {
    return false;
  }
  return Date.now() - new Date(meta.oldestAt).getTime() >= BUFFER_FLUSH_MS;
}

async function flushBufferedEvents(
  event: IntegrityEventIngress,
  candidateSessionDocumentId: string,
  assessmentSlug: string
): Promise<{ count: number; status: number; body: unknown }> {
  const { listKey, metaKey } = bufferKeys(
    event.userId,
    candidateSessionDocumentId,
    assessmentSlug
  );

  const serializedEvents = await upstashLrange(listKey, 0, -1);
  if (serializedEvents.length === 0) {
    return { count: 0, status: 200, body: { ok: true, flushed: 0 } };
  }

  await upstashDel(listKey);
  await upstashDel(metaKey);

  let lastStatus = 200;
  let lastBody: unknown = { ok: true, flushed: serializedEvents.length };

  for (const raw of serializedEvents) {
    try {
      const buffered = JSON.parse(raw) as SerializedBufferedEvent;
      const result = await forwardSingleIntegrityEvent(event, buffered.payload);
      lastStatus = result.status;
      lastBody = result.body;
    } catch {
      // Best effort — continue flushing remaining buffered events.
    }
  }

  return { count: serializedEvents.length, status: lastStatus, body: lastBody };
}

async function flushStaleBufferIfNeeded(
  event: IntegrityEventIngress,
  candidateSessionDocumentId: string,
  assessmentSlug: string
): Promise<void> {
  const { listKey, metaKey } = bufferKeys(
    event.userId,
    candidateSessionDocumentId,
    assessmentSlug
  );
  const [meta, bufferLength] = await Promise.all([
    upstashGetJson<BufferMeta>(metaKey),
    upstashLlen(listKey),
  ]);

  if (shouldFlushBuffer(meta, bufferLength)) {
    await flushBufferedEvents(event, candidateSessionDocumentId, assessmentSlug);
  }
}

export async function recordIntegrityEventViaBuffer(
  event: IntegrityEventIngress
): Promise<{ status: number; body: unknown; buffered: boolean }> {
  const candidateSessionDocumentId = String(event.payload.candidateSessionDocumentId ?? "");
  const assessmentSlug = String(event.payload.assessmentSlug ?? "");
  const eventType = String(event.payload.eventType ?? "");

  if (!isUpstashConfigured()) {
    const result = await forwardSingleIntegrityEvent(event, event.payload);
    return { status: result.status, body: result.body, buffered: false };
  }

  if (IMMEDIATE_FLUSH_EVENT_TYPES.has(eventType)) {
    await flushStaleBufferIfNeeded(event, candidateSessionDocumentId, assessmentSlug);
    await flushBufferedEvents(event, candidateSessionDocumentId, assessmentSlug);
    const result = await forwardSingleIntegrityEvent(event, event.payload);
    return {
      status: result.status,
      body: result.body,
      buffered: false,
    };
  }

  await flushStaleBufferIfNeeded(event, candidateSessionDocumentId, assessmentSlug);

  const { listKey, metaKey } = bufferKeys(
    event.userId,
    candidateSessionDocumentId,
    assessmentSlug
  );

  const hadEvents = (await upstashLlen(listKey)) > 0;
  const pushed = await upstashLpush(
    listKey,
    JSON.stringify({
      payload: event.payload,
      clientIp: event.clientIp,
      userAgent: event.userAgent,
    } satisfies SerializedBufferedEvent)
  );

  if (!pushed) {
    const result = await forwardSingleIntegrityEvent(event, event.payload);
    return { status: result.status, body: result.body, buffered: false };
  }

  await upstashPexpire(listKey, BUFFER_TTL_MS);

  if (!hadEvents) {
    await upstashSetJson(metaKey, { oldestAt: new Date().toISOString() }, BUFFER_TTL_MS);
  }

  const [meta, bufferLength] = await Promise.all([
    upstashGetJson<BufferMeta>(metaKey),
    upstashLlen(listKey),
  ]);

  if (shouldFlushBuffer(meta, bufferLength)) {
    const flushed = await flushBufferedEvents(event, candidateSessionDocumentId, assessmentSlug);
    return {
      status: flushed.status,
      body: flushed.body,
      buffered: false,
    };
  }

  return {
    status: 200,
    body: { ok: true, buffered: true },
    buffered: true,
  };
}
