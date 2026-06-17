export type AssessmentAttemptStatus = "in_progress" | "abandoned_locked" | "completed";
export type AssessmentRecoveryMode = "resume" | "restart";

export type CandidateAssessmentAttempt = {
  documentId?: string;
  candidateSessionDocumentId?: string;
  assessmentSlug?: string;
  contentVersion?: string | null;
  attemptStatus?: AssessmentAttemptStatus;
  recoveryMode?: AssessmentRecoveryMode | null;
  snapshot?: Record<string, unknown> | null;
  abandonReason?: string | null;
  attemptNumber?: number;
  startedAt?: string | null;
  lastHeartbeatAt?: string | null;
  abandonedAt?: string | null;
  recoveredAt?: string | null;
  users_permissions_user?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    documentId?: string;
  } | null;
  candidateSession?: {
    documentId?: string;
    candidateCode?: string;
    campaign?: { name?: string; documentId?: string } | null;
    assessment_session?: { name?: string; documentId?: string } | null;
  } | null;
};

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  return body;
}

export class AssessmentAttemptService {
  static async getStatus(
    candidateSessionDocumentId: string,
    assessmentSlug: string
  ): Promise<CandidateAssessmentAttempt | null> {
    const query = new URLSearchParams({
      candidateSessionDocumentId,
      assessmentSlug,
    });
    const body = await readJson<{ data?: CandidateAssessmentAttempt | null }>(
      await fetch(`/api/assessment/attempt/status?${query.toString()}`, {
        cache: "no-store",
      })
    );
    return body.data ?? null;
  }

  static async heartbeat(input: {
    candidateSessionDocumentId: string;
    assessmentSlug: string;
    contentVersion?: string | null;
    snapshot?: Record<string, unknown> | null;
    start?: boolean;
  }): Promise<CandidateAssessmentAttempt> {
    const body = await readJson<{ data: CandidateAssessmentAttempt }>(
      await fetch("/api/assessment/attempt/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
    return body.data;
  }

  static async abandon(input: {
    candidateSessionDocumentId: string;
    assessmentSlug: string;
    snapshot?: Record<string, unknown> | null;
    reason?: string;
  }): Promise<CandidateAssessmentAttempt> {
    const body = await readJson<{ data: CandidateAssessmentAttempt }>(
      await fetch("/api/assessment/attempt/abandon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        keepalive: true,
      })
    );
    return body.data;
  }

  static async complete(input: {
    candidateSessionDocumentId: string;
    assessmentSlug: string;
  }): Promise<void> {
    await readJson(
      await fetch("/api/assessment/attempt/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
  }

  static async listAbandonedForAdmin(limit = 50): Promise<CandidateAssessmentAttempt[]> {
    const query = new URLSearchParams({
      status: "abandoned_locked",
      limit: String(limit),
    });
    const body = await readJson<{ data?: CandidateAssessmentAttempt[] }>(
      await fetch(`/api/admin/assessment-attempts?${query.toString()}`, {
        cache: "no-store",
      })
    );
    return body.data ?? [];
  }

  static async adminRecover(input: {
    candidateSessionDocumentId: string;
    assessmentSlug: string;
    action: AssessmentRecoveryMode;
    contentVersion?: string | null;
  }): Promise<CandidateAssessmentAttempt> {
    const body = await readJson<{ data: CandidateAssessmentAttempt }>(
      await fetch("/api/admin/assessment-attempts/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
    return body.data;
  }

  static async recover(input: {
    candidateSessionDocumentId: string;
    assessmentSlug: string;
    action: AssessmentRecoveryMode;
    contentVersion?: string | null;
  }): Promise<CandidateAssessmentAttempt> {
    const body = await readJson<{ data: CandidateAssessmentAttempt }>(
      await fetch("/api/assessment/attempt/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
    return body.data;
  }

  static async listRecoveryAttempts(scope: "admin" | "portal" = "portal"): Promise<CandidateAssessmentAttempt[]> {
    const url =
      scope === "admin"
        ? "/api/admin/assessment-attempts?status=abandoned_locked&limit=100"
        : "/api/assessment/attempt/recovery-list?limit=100";
    const body = await readJson<{ data?: CandidateAssessmentAttempt[] }>(
      await fetch(url, { cache: "no-store" })
    );
    return body.data ?? [];
  }

  static async searchAbandonedForAdmin(query: string): Promise<CandidateAssessmentAttempt[]> {
    const params = new URLSearchParams({ q: query, limit: "100" });
    const body = await readJson<{ data?: CandidateAssessmentAttempt[] }>(
      await fetch(`/api/admin/assessment-attempts/search?${params.toString()}`, {
        cache: "no-store",
      })
    );
    return body.data ?? [];
  }

  static async adminForceAbandon(input: {
    candidateSessionDocumentId: string;
    assessmentSlug: string;
    reason?: string;
  }): Promise<CandidateAssessmentAttempt> {
    const body = await readJson<{ data: CandidateAssessmentAttempt }>(
      await fetch("/api/admin/assessment-attempts/force-abandon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      })
    );
    return body.data;
  }
}
