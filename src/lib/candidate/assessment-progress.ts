/** Candidate-facing progress statuses projected from Firebase attempts. */
export type CandidateAssessmentProgressStatus =
  | "available"
  | "in_progress"
  | "submitted"
  | "completed"
  | "not_open"
  | "locked"
  | "abandoned"
  | string;

/** Submitted (or scored) — candidate cannot start again. */
export function isCandidateAssessmentSubmitted(
  status: CandidateAssessmentProgressStatus | undefined,
): boolean {
  return status === "submitted" || status === "completed" || status === "scoring";
}

/** Fully scored terminal progress. */
export function isCandidateAssessmentComplete(
  status: CandidateAssessmentProgressStatus | undefined,
): boolean {
  return status === "completed";
}
