import type { HiringManagerAssessmentResult } from "@/types/hiring-manager.types";
export function reportStatus(result: HiringManagerAssessmentResult): string {
  if (result.metrics?.scoringStalled === true) return "Marking delayed";
  const labels: Record<string, string> = {
    "not-started": "Not started", "in-progress": "In progress", submitted: "Submitted",
    marking: "Marking", "marking-failed": "Marking failed", failed: "Marking failed", abandoned: "Abandoned",
    completed: result.passed === true ? "Standard met" : result.passed === false ? "Standard not met" : "Completed"
  };
  return labels[result.assessmentStatus ?? ""] ?? "Result unavailable";
}
export function reportIsPending(results: readonly HiringManagerAssessmentResult[]): boolean {
  return results.some(result => ["not-started", "in-progress", "submitted", "marking"].includes(result.assessmentStatus ?? ""));
}
export function reportIdentity(result: HiringManagerAssessmentResult): string {
  return [result.campaignAssessmentId, result.metrics?.attemptId, result.metrics?.resultId, result.metrics?.revision, result.metrics?.releaseId, result.metrics?.releaseHash].join(":");
}
