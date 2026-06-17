import { listAssessmentSlugs } from "@/assessments/plugins/registry";

const KNOWN_SLUGS = new Set(listAssessmentSlugs());

/**
 * Normalises assessment slug or display-name variants to a canonical registry slug.
 */
export function normalizeSlug(value?: string | null): string {
  if (!value) return "";

  const slug = value
    .toLowerCase()
    .trim()
    .replace(/_/g, "-")
    .replace(/prioritization/g, "prioritisation")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (KNOWN_SLUGS.has(slug)) return slug;

  const compact = slug.replace(/-/g, "");

  if (
    slug.includes("situational") ||
    compact === "sjt" ||
    compact.includes("situationaljudgement")
  ) {
    return "situational-judgement";
  }
  if (slug.includes("prioritisation") || slug === "pja") {
    return "prioritisation";
  }
  if (slug.includes("call") || compact.includes("callsimulation")) {
    return "call-simulation";
  }
  if (slug.includes("typing")) {
    return "typing";
  }

  return slug;
}

export function isKnownAssessmentSlug(slug: string): boolean {
  return KNOWN_SLUGS.has(normalizeSlug(slug));
}
