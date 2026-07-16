import { FileQuestion, type LucideIcon } from "lucide-react";
import {
  isKnownAssessmentSlug,
  normalizeSlug,
  resolveAssessmentSlug,
} from "@/lib/assessment-slug";
import { getAssessmentPluginIcon, getAssessmentPluginTitle } from "./registry";
import { CANDIDATE_ASSESSMENT_CATALOG } from "./candidate-catalog";

const warnedUnknownSlugs = new Set<string>();

function getAssessmentCatalogueItem(slug: string) {
  return CANDIDATE_ASSESSMENT_CATALOG.find((item) => item.slug === slug);
}

/** Resolve a catalogue slug from a display name, slug, or result payload. */
export function resolveAssessmentCatalogueSlug(
  value?: string | null,
  result?: unknown
): string {
  const slug = normalizeSlug(value);
  if (isKnownAssessmentSlug(slug)) return slug;

  const resolved = resolveAssessmentSlug(
    value,
    result as { metrics?: Record<string, unknown> } | null | undefined
  );
  if (resolved) return resolved;

  return "";
}

/** Icon from the registered assessment catalogue (CANDIDATE_ASSESSMENT_CATALOG / plugin registry). */
export function getAssessmentCatalogueIcon(
  value?: string | null,
  result?: unknown
): LucideIcon {
  const slug = resolveAssessmentCatalogueSlug(value, result);
  const icon = slug
    ? getAssessmentCatalogueItem(slug)?.icon ?? getAssessmentPluginIcon(slug)
    : undefined;
  if (!icon && process.env.NODE_ENV !== "production") {
    const unknown = value?.trim() || "unknown";
    if (!warnedUnknownSlugs.has(unknown)) {
      warnedUnknownSlugs.add(unknown);
      console.warn(`[assessment-catalogue] No display metadata for ${unknown}`);
    }
  }
  return icon || FileQuestion;
}

/** Title from the registered assessment catalogue, with optional fallback label. */
export function getAssessmentCatalogueTitle(
  value?: string | null,
  fallback?: string
): string {
  const slug = resolveAssessmentCatalogueSlug(value);
  if (slug) {
    const title = getAssessmentCatalogueItem(slug)?.title ?? getAssessmentPluginTitle(slug);
    if (title) return title;
  }
  return fallback?.trim() || value?.trim() || "Assessment";
}
