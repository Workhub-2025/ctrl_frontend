import type {
  AssessmentReadiness,
  LaunchEnvelope,
} from "@/assessment-modules/types";

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: string | { message?: string };
    message?: string;
  };
  if (!response.ok) {
    const error =
      typeof body.error === "string" ? body.error : body.error?.message;
    throw new Error(
      error ?? body.message ?? `Request failed (${response.status})`,
    );
  }
  return body;
}

export const AssessmentRuntimeClient = {
  async readiness<TPractice = unknown>(
    candidateSessionDocumentId: string,
    slug: string,
  ): Promise<AssessmentReadiness<TPractice>> {
    const query = new URLSearchParams({ candidateSessionDocumentId, slug });
    const body = await readJson<{ data: AssessmentReadiness<TPractice> }>(
      await fetch(`/api/assessment-runtime/readiness?${query}`, {
        cache: "no-store",
      }),
    );
    return body.data;
  },
  async start<TContent = unknown>(
    candidateSessionDocumentId: string,
    slug: string,
    idempotencyKey: string,
  ): Promise<LaunchEnvelope<TContent>> {
    const body = await readJson<{ data: LaunchEnvelope<TContent> }>(
      await fetch("/api/assessment-runtime/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateSessionDocumentId,
          slug,
          idempotencyKey,
        }),
      }),
    );
    return body.data;
  },
  async heartbeat(attemptId: string) {
    return readJson(
      await fetch(
        `/api/assessment-runtime/attempts/${encodeURIComponent(attemptId)}/heartbeat`,
        { method: "POST" },
      ),
    );
  },
  async progress(attemptId: string, revision: number, progress: unknown) {
    const body = await readJson<{ data: { progressRevision: number } }>(
      await fetch(
        `/api/assessment-runtime/attempts/${encodeURIComponent(attemptId)}/progress`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ revision, progress }),
        },
      ),
    );
    return body.data;
  },
  async event(
    attemptId: string,
    event: {
      type: string;
      occurredAt?: string;
      durationMs?: number;
      stageId?: string;
    },
  ) {
    const body = await readJson<{ data: { status: string } }>(
      await fetch(
        `/api/assessment-runtime/attempts/${encodeURIComponent(attemptId)}/events`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(event),
          keepalive: true,
        },
      ),
    );
    return body.data;
  },
  async submit(attemptId: string, idempotencyKey: string, submission: unknown) {
    const body = await readJson<{
      data: { receiptId: string; status: "received"; submittedAt: string };
    }>(
      await fetch(
        `/api/assessment-runtime/attempts/${encodeURIComponent(attemptId)}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idempotencyKey, submission }),
        },
      ),
    );
    return body.data;
  },
  async restart<TContent = unknown>(
    attemptId: string,
    idempotencyKey: string,
  ): Promise<LaunchEnvelope<TContent>> {
    const body = await readJson<{ data: LaunchEnvelope<TContent> }>(
      await fetch(
        `/api/assessment-runtime/attempts/${encodeURIComponent(attemptId)}/restart`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idempotencyKey }),
        },
      ),
    );
    return body.data;
  },
};
