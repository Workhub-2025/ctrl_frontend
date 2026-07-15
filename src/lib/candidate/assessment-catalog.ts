import { candidateAssessmentItems } from "@/assessments/plugins/candidate-catalog";
import { normalizeSlug } from "@/lib/assessment-slug";

type CandidateAssessmentReference = {
  slug?: string | null;
  name?: string | null;
};

/**
 * Resolve backend assessment metadata to the matching candidate catalogue entry.
 * Prefer the canonical slug, then fall back to the assessment name for legacy data.
 */
export function resolveCandidateAssessmentCatalogItem(
  assessment: CandidateAssessmentReference
) {
  const resolvedSlug = normalizeSlug(assessment.slug) || normalizeSlug(assessment.name);
  const item = candidateAssessmentItems.find(
    (candidateItem) =>
      candidateItem.slug === resolvedSlug ||
      normalizeSlug(candidateItem.title) === resolvedSlug
  );

  return {
    item,
    resolvedSlug: item?.slug || resolvedSlug || "unknown",
  };
}
