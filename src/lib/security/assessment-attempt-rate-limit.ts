import { applyRateLimit, type RateLimitResult } from "@/lib/security/api-rate-limit";

const ATTEMPT_RATE_LIMIT = 25;
const ATTEMPT_RATE_WINDOW_MS = 60_000;

export type AssessmentAttemptRateLimitKind = "heartbeat" | "progress";

export function assessmentAttemptRateLimitKey(
  kind: AssessmentAttemptRateLimitKind,
  userId: string,
  candidateSessionDocumentId: string,
  assessmentSlug: string
): string {
  return `assessment:${kind}:${userId}:${candidateSessionDocumentId}:${assessmentSlug}`;
}

export function parseAttemptIdentifiers(payload: unknown): {
  candidateSessionDocumentId: string;
  assessmentSlug: string;
} | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const { candidateSessionDocumentId, assessmentSlug } = payload as Record<string, unknown>;
  if (typeof candidateSessionDocumentId !== "string" || !candidateSessionDocumentId.trim()) {
    return null;
  }
  if (typeof assessmentSlug !== "string" || !assessmentSlug.trim()) {
    return null;
  }

  return {
    candidateSessionDocumentId: candidateSessionDocumentId.trim(),
    assessmentSlug: assessmentSlug.trim(),
  };
}

export async function applyAssessmentAttemptRateLimit({
  kind,
  userId,
  candidateSessionDocumentId,
  assessmentSlug,
}: {
  kind: AssessmentAttemptRateLimitKind;
  userId: string;
  candidateSessionDocumentId: string;
  assessmentSlug: string;
}): Promise<RateLimitResult> {
  return applyRateLimit({
    key: assessmentAttemptRateLimitKey(
      kind,
      userId,
      candidateSessionDocumentId,
      assessmentSlug
    ),
    limit: ATTEMPT_RATE_LIMIT,
    windowMs: ATTEMPT_RATE_WINDOW_MS,
  });
}
