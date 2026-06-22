import {
  isKnownAssessmentSlug,
  normalizeAssessmentSlugInput,
  normalizeSlug,
  resolveAssessmentSlug,
} from "@/lib/assessment-slug";
import { isAbandonedAssessmentResult } from "@/lib/assessment-result-status";

/** Resolve a known assessment slug from a label and optional result payload. */
export function getAssessmentKey(value?: string | null, result?: unknown) {
  const slug = normalizeSlug(value);
  if (isKnownAssessmentSlug(slug)) return slug;

  const resolved = resolveAssessmentSlug(
    value,
    result as { metrics?: Record<string, unknown> } | null | undefined
  );
  if (resolved) return resolved;

  if (result && typeof result === "object") {
    const payload = result as Record<string, unknown>;
    if (typeof payload.wpm === "number" || typeof payload.accuracy === "number") {
      return "typing";
    }
    if (typeof payload.durationSeconds === "number") {
      return "call-simulation";
    }
  }

  return "";
}

/** Fuzzy match between stack labels and persisted assessment result names. */
export function isSameAssessment(expectedName?: string | null, resultName?: string | null) {
  const expectedKey = getAssessmentKey(expectedName);
  const resultKey = getAssessmentKey(resultName);
  if (expectedKey && resultKey) return expectedKey === resultKey;

  const expected = normalizeAssessmentSlugInput(expectedName);
  const result = normalizeAssessmentSlugInput(resultName);
  return expected && result ? expected.includes(result) || result.includes(expected) : false;
}

type StackEntry = { displayName: string; slug?: string };
type MatchableResult = {
  assessment?: string | null;
  assessmentStatus?: string | null;
};

/** Find the result row that corresponds to a campaign stack entry. */
export function findAssessmentResultForStackEntry<T extends MatchableResult>(
  entry: StackEntry,
  results: T[],
  options?: { skipAbandoned?: boolean }
): T | null {
  return (
    results.find((candidateResult) => {
      if (options?.skipAbandoned && isAbandonedAssessmentResult(candidateResult.assessmentStatus)) {
        return false;
      }
      const resultKey = getAssessmentKey(candidateResult.assessment);
      if (entry.slug && resultKey) return entry.slug === resultKey;
      return isSameAssessment(entry.displayName, candidateResult.assessment);
    }) ?? null
  );
}
