import { isSameAssessment } from "@/lib/hiring-manager/assessment-matching";

/**
 * Weights are validated as totalling 100%. Resolve each one against the
 * assessment it belongs to so the backend persists the campaign weighting
 * rather than falling back to an equal split.
 */
export function readAssessmentWeight(
  assessmentSettings: Record<string, unknown> | undefined,
  slug: string,
  selectedId: string,
): number | null {
  const weights = assessmentSettings?.weights;
  if (!weights || typeof weights !== "object" || Array.isArray(weights)) {
    return null;
  }
  const entry = Object.entries(weights as Record<string, unknown>).find(
    ([key]) => key === selectedId || key === slug || isSameAssessment(slug, key),
  );
  const value = entry ? Number(entry[1]) : Number.NaN;
  return Number.isFinite(value) ? Math.round(value) : null;
}

export function validateAssessmentStackPayload(input: {
  assessmentDocumentIds: string[];
  assessmentSettings?: Record<string, unknown> | null;
}): string | null {
  const weights = input.assessmentSettings?.weights;
  if (!weights || typeof weights !== "object" || Array.isArray(weights)) {
    return "Assessment weights are required";
  }

  const weightValues = Object.values(weights as Record<string, unknown>);
  if (weightValues.length !== input.assessmentDocumentIds.length) {
    return "Each selected assessment must have a weighting";
  }

  const total = weightValues.reduce<number>((sum, value) => {
    const numeric = typeof value === "number" ? value : Number(value);
    return sum + (Number.isFinite(numeric) ? numeric : Number.NaN);
  }, 0);

  if (!Number.isFinite(total) || total !== 100) {
    return "Assessment weights must equal 100% overall before saving.";
  }

  return null;
}
