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

export {
  formatAssessmentSlugLabel,
  TIMED_ASSESSMENT_SLUGS,
} from "@/lib/assessment-slug";

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
