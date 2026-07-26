import { getAssessmentCompletionLabel } from "@/lib/assessment-completion-status";

export type AssessmentResultLifecycleStatus =
  | "pending"
  | "in-progress"
  | "submitted"
  | "completed"
  | "expired"
  | "abandoned";

export function isAbandonedAssessmentResult(
  assessmentStatus?: string | null
): boolean {
  return assessmentStatus === "abandoned";
}

export function isSubmittedAssessmentResult(
  assessmentStatus?: string | null
): boolean {
  return (
    assessmentStatus === "submitted" ||
    assessmentStatus === "scoring" ||
    assessmentStatus === "completed"
  );
}

export function isCompletedAssessmentResult(input: {
  assessmentStatus?: string | null;
  completedAt?: string | null;
  numericScore?: number | null;
}): boolean {
  if (isAbandonedAssessmentResult(input.assessmentStatus)) return false;
  if (input.assessmentStatus === "submitted" || input.assessmentStatus === "scoring") {
    return false;
  }
  if (input.assessmentStatus === "completed") return true;
  return Boolean(input.completedAt || input.numericScore !== null);
}

export function formatAssessmentResultScore(input: {
  assessmentStatus?: string | null;
  numericScore?: number | null;
  metrics?: Record<string, unknown> | null;
}): string {
  if (isAbandonedAssessmentResult(input.assessmentStatus)) return "Abandoned";
  if (input.assessmentStatus === "submitted" || input.assessmentStatus === "scoring") {
    return "Submitted";
  }
  if (input.numericScore === null || input.numericScore === undefined) return "Pending";
  const completionLabel = getAssessmentCompletionLabel(input.metrics ?? null);
  const scoreLabel = `${Math.round(input.numericScore)}%`;
  return completionLabel ? `${scoreLabel} · ${completionLabel}` : scoreLabel;
}

export {
  formatAssessmentSlugLabel,
  TIMED_ASSESSMENT_SLUGS,
} from "@/lib/assessment-slug";
export { getAssessmentCompletionLabel } from "@/lib/assessment-completion-status";

export function getHmAssessmentItemStatus(result?: {
  assessmentStatus?: string | null;
  completedAt?: string | null;
  numericScore?: number | null;
} | null): "abandoned" | "completed" | "submitted" | "pending" {
  if (!result) return "pending";
  if (isAbandonedAssessmentResult(result.assessmentStatus)) return "abandoned";
  if (
    result.assessmentStatus === "submitted" ||
    result.assessmentStatus === "scoring"
  ) {
    return "submitted";
  }
  if (isCompletedAssessmentResult(result)) return "completed";
  return "pending";
}
