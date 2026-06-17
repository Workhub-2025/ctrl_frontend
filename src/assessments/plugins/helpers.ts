import type { PlatformAssessmentSlug } from "@/lib/assessment-slug";

/** Canonical candidate route for an assessment slug. */
export function getAssessmentPagePath(slug: string): string {
  return `/assessment/${slug}`;
}

/** Unified BFF submit route for all platform assessments. */
export function getAssessmentSubmitUrl(slug: string): string {
  return `/api/assessment/${slug}/submit`;
}

export function isPlatformAssessmentSlug(slug: string): slug is PlatformAssessmentSlug {
  return (
    slug === "typing" ||
    slug === "call-simulation" ||
    slug === "situational-judgement" ||
    slug === "prioritisation"
  );
}
