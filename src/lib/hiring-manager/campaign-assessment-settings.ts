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
