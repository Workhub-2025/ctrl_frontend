import type {
  AssessmentReadiness,
  LaunchEnvelope,
} from "@/assessment-modules/types";
import { assessmentDeviceRequestHeaders } from "@/lib/assessment-device-eligibility";

export type PageVisibility = {
  hidden: boolean;
  focused: boolean;
  fullscreen: boolean;
};

export type HeartbeatState = {
  status: "in_progress";
  serverTime: string;
  deadlineAt: string | null;
  /** Past the deadline but inside the server's grace: submit now. */
  deadlinePassed?: boolean;
  networkResumesLeft?: number;
  resumedAfterDrop?: boolean;
};

/** The server's reason when it has ended an attempt, read from its error. */
export function closedAttemptReason(
  error: unknown,
): "deadline_auto_submit" | "deadline_expired" | "network_limit" | "focus_violation" | "locked" | null {
  const message = error instanceof Error ? error.message : "";
  for (const reason of [
    "deadline_auto_submit",
    "deadline_expired",
    "network_limit",
    "focus_violation",
  ] as const) {
    if (message.includes(reason)) return reason;
  }
  return /locked|abandoned|interrupted/i.test(message) ? "locked" : null;
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: string | { message?: string };
    message?: string;
  };
  if (!response.ok) {
    const error =
      typeof body.error === "string" ? body.error : body.error?.message;
    const message =
      error ?? body.message ?? `Request failed (${response.status})`;
    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
  return body;
}

function attemptIdempotencyStorageKey(
  kind: "submit" | "restart",
  attemptId: string,
): string {
  return `ctrl:assessment:${kind}:${attemptId}`;
}

function readPersistedIdempotencyKey(
  kind: "submit" | "restart",
  attemptId: string,
): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(attemptIdempotencyStorageKey(kind, attemptId));
  } catch {
    return null;
  }
}

function persistIdempotencyKey(
  kind: "submit" | "restart",
  attemptId: string,
  key: string,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(attemptIdempotencyStorageKey(kind, attemptId), key);
  } catch {
    // sessionStorage may be unavailable; continue with in-memory key.
  }
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
        headers: {
          "Content-Type": "application/json",
          ...assessmentDeviceRequestHeaders(),
        },
        body: JSON.stringify({
          candidateSessionDocumentId,
          slug,
          idempotencyKey,
        }),
      }),
    );
    return body.data;
  },
  /**
   * Proof of life, with the page's own visibility. The server enforces the
   * deadline and connection rules and answers with the attempt's state.
   */
  async heartbeat(attemptId: string, visibility: PageVisibility) {
    const body = await readJson<{ data: HeartbeatState }>(
      await fetch(
        `/api/assessment-runtime/attempts/${encodeURIComponent(attemptId)}/heartbeat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibility }),
        },
      ),
    );
    return body.data;
  },
  /**
   * Saves stage progress. `draftSubmission` is what the page would submit
   * right now; the server submits it if the deadline passes first.
   */
  async progress(
    attemptId: string,
    revision: number,
    progress: unknown,
    draftSubmission?: unknown,
  ) {
    const body = await readJson<{ data: { progressRevision: number } }>(
      await fetch(
        `/api/assessment-runtime/attempts/${encodeURIComponent(attemptId)}/progress`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            revision,
            progress,
            ...(draftSubmission !== undefined ? { draftSubmission } : {}),
          }),
        },
      ),
    );
    return body.data;
  },
  async resume<TContent = unknown>(
    attemptId: string,
  ): Promise<LaunchEnvelope<TContent>> {
    const body = await readJson<{
      data: LaunchEnvelope<TContent>;
    }>(
      await fetch(
        `/api/assessment-runtime/attempts/${encodeURIComponent(attemptId)}/resume`,
        { method: "POST", headers: { "Content-Type": "application/json" } },
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
          headers: {
            "Content-Type": "application/json",
            ...assessmentDeviceRequestHeaders(),
          },
          body: JSON.stringify(event),
          keepalive: true,
        },
      ),
    );
    return body.data;
  },
  async submit(attemptId: string, idempotencyKey: string, submission: unknown) {
    const key =
      readPersistedIdempotencyKey("submit", attemptId) ?? idempotencyKey;
    persistIdempotencyKey("submit", attemptId, key);
    const body = await readJson<{
      data: {
        receiptId: string;
        status: "received";
        submittedAt: string;
        assignmentId?: string;
        organizationId?: string;
        campaignId?: string;
      };
    }>(
      await fetch(
        `/api/assessment-runtime/attempts/${encodeURIComponent(attemptId)}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idempotencyKey: key, submission }),
        },
      ),
    );
    return body.data;
  },
  async restart<TContent = unknown>(
    attemptId: string,
    idempotencyKey: string,
  ): Promise<LaunchEnvelope<TContent>> {
    const key =
      readPersistedIdempotencyKey("restart", attemptId) ?? idempotencyKey;
    persistIdempotencyKey("restart", attemptId, key);
    const body = await readJson<{ data: LaunchEnvelope<TContent> }>(
      await fetch(
        `/api/assessment-runtime/attempts/${encodeURIComponent(attemptId)}/restart`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idempotencyKey: key }),
        },
      ),
    );
    return body.data;
  },
};
