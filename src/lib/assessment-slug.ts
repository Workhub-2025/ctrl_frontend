import { completionLabels } from "@/assessments/plugins/candidate-catalog";
import {
  PLATFORM_ASSESSMENT_SLUGS,
  TIMED_ASSESSMENT_SLUGS,
  isPlatformAssessmentSlug,
  type PlatformAssessmentSlug,
} from "@/lib/assessment-platform-registry";

export type { PlatformAssessmentSlug };
export { PLATFORM_ASSESSMENT_SLUGS, TIMED_ASSESSMENT_SLUGS };

export function normalizeAssessmentSlugInput(value?: string | null): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/prioritization/g, "prioritisation")
    .replace(/[^a-z0-9]/g, "");
}

export function resolveAssessmentSlug(
  value?: string | null,
  result?: { metrics?: Record<string, unknown> } | null,
): PlatformAssessmentSlug | null {
  const normalized = normalizeAssessmentSlugInput(value);

  if (normalized.includes("prioritisation") || normalized === "pja") {
    return "prioritisation";
  }
  if (normalized.includes("situationaljudgement") || normalized === "sjt") {
    return "situational-judgement";
  }
  if (normalized.includes("callsimulation")) {
    return "call-simulation";
  }
  if (normalized.includes("typing")) {
    return "typing";
  }
  if (normalized.includes("shorttermmemory") || normalized === "stm") {
    return "short-term-memory";
  }

  if (result?.metrics) {
    const metrics = result.metrics;
    if (metrics.factRecallAccuracy !== undefined) return "short-term-memory";
    if (metrics.highPriorityAccuracy !== undefined) return "prioritisation";
    if (metrics.correct !== undefined) return "situational-judgement";
    if (metrics.averageWpm !== undefined) return "typing";
    if (metrics.callScores !== undefined || metrics.scenarioKey !== undefined) {
      return "call-simulation";
    }
  }

  return null;
}

export function normalizeSlug(value?: string | null): string {
  return resolveAssessmentSlug(value) ?? normalizeAssessmentSlugInput(value);
}

export function isKnownAssessmentSlug(
  value: string,
): value is PlatformAssessmentSlug {
  return isPlatformAssessmentSlug(value);
}

export function formatAssessmentSlugLabel(slug: string): string {
  return (
    completionLabels[slug] ??
    slug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}
