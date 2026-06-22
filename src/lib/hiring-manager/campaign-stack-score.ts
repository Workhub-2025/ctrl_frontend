import { isSameAssessment } from "@/lib/hiring-manager/assessment-matching";
import type { HiringManagerResolvedStackSummary } from "@/types/hiring-manager.types";

export type CompositeStackEntry = {
  displayName: string;
  slug?: string;
  weight: number;
};

function numberOrNull(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildEqualWeights(assessmentStack: string[]) {
  if (assessmentStack.length === 0) return {};
  const baseWeight = Math.floor(100 / assessmentStack.length);
  const remainder = 100 - baseWeight * assessmentStack.length;
  return assessmentStack.reduce<Record<string, number>>((weights, name, index) => {
    weights[name] = baseWeight + (index < remainder ? 1 : 0);
    return weights;
  }, {});
}

export function getCampaignWeights(
  assessmentStack: string[],
  assessmentSettings?: Record<string, unknown> | null
) {
  const rawWeights =
    assessmentSettings &&
    typeof assessmentSettings.weights === "object" &&
    assessmentSettings.weights !== null &&
    !Array.isArray(assessmentSettings.weights)
      ? (assessmentSettings.weights as Record<string, unknown>)
      : null;

  if (!rawWeights) return buildEqualWeights(assessmentStack);

  return assessmentStack.reduce<Record<string, number>>((weights, assessmentName) => {
    const matchedEntry = Object.entries(rawWeights).find(([key]) =>
      isSameAssessment(assessmentName, key)
    );
    const numericValue = matchedEntry ? Number(matchedEntry[1]) : Number.NaN;
    weights[assessmentName] = Number.isFinite(numericValue) ? numericValue : 0;
    return weights;
  }, {});
}

type RawResolvedStackSummary = {
  assessments?: Array<{
    documentId?: string;
    slug?: string;
    displayName?: string;
    weight?: number;
  }>;
  weightsTotal?: number;
  resolvedAt?: string;
};

export function normalizeResolvedStackSummary(
  summary?: RawResolvedStackSummary | null
): HiringManagerResolvedStackSummary | null {
  if (!summary || !Array.isArray(summary.assessments) || summary.assessments.length === 0) {
    return null;
  }

  const assessments = summary.assessments
    .map((item) => ({
      documentId: item.documentId ?? item.slug ?? "assessment",
      slug: item.slug ?? item.documentId ?? "assessment",
      displayName: item.displayName ?? item.slug ?? "Assessment",
      weight: numberOrNull(item.weight) ?? 0,
    }))
    .filter((item) => Boolean(item.slug));

  if (assessments.length === 0) return null;

  const weightsTotal =
    numberOrNull(summary.weightsTotal) ??
    assessments.reduce((sum, item) => sum + item.weight, 0);

  return {
    assessments,
    weightsTotal,
    resolvedAt: summary.resolvedAt ?? new Date().toISOString(),
  };
}

/**
 * Build weighted stack entries for composite scoring — prefers denormalized
 * `resolvedStackSummary` (backend source of truth), then campaign settings weights.
 */
export function buildCompositeStackEntries(options: {
  assessmentStack: string[];
  assessmentSettings?: Record<string, unknown> | null;
  resolvedStackSummary?: HiringManagerResolvedStackSummary | null;
}): CompositeStackEntry[] {
  const { assessmentStack, assessmentSettings, resolvedStackSummary } = options;

  if (resolvedStackSummary?.assessments?.length) {
    return resolvedStackSummary.assessments.map((item) => ({
      displayName: item.displayName,
      slug: item.slug,
      weight: item.weight,
    }));
  }

  const weights = getCampaignWeights(assessmentStack, assessmentSettings);
  return assessmentStack.map((displayName) => ({
    displayName,
    weight: weights[displayName] ?? 0,
  }));
}
