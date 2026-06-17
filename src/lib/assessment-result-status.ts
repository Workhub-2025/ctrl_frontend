export type AssessmentResultLifecycleStatus =
  | "pending"
  | "in-progress"
  | "completed"
  | "expired"
  | "abandoned";

export function isAbandonedAssessmentResult(
  assessmentStatus?: string | null
): boolean {
  return assessmentStatus === "abandoned";
}

export function isCompletedAssessmentResult(input: {
  assessmentStatus?: string | null;
  completedAt?: string | null;
  numericScore?: number | null;
}): boolean {
  if (isAbandonedAssessmentResult(input.assessmentStatus)) return false;
  return Boolean(input.completedAt || input.numericScore !== null);
}

export function formatAssessmentResultScore(input: {
  assessmentStatus?: string | null;
  numericScore?: number | null;
}): string {
  if (isAbandonedAssessmentResult(input.assessmentStatus)) return "Abandoned";
  if (input.numericScore === null || input.numericScore === undefined) return "Pending";
  return `${Math.round(input.numericScore)}%`;
}

export const TIMED_ASSESSMENT_SLUGS = new Set([
  "situational-judgement",
  "prioritisation",
  "call-simulation",
]);

export function getHmAssessmentItemStatus(result?: {
  assessmentStatus?: string | null;
  completedAt?: string | null;
  numericScore?: number | null;
} | null): "abandoned" | "completed" | "pending" {
  if (!result) return "pending";
  if (isAbandonedAssessmentResult(result.assessmentStatus)) return "abandoned";
  if (isCompletedAssessmentResult(result)) return "completed";
  return "pending";
}

export function formatAssessmentSlugLabel(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
