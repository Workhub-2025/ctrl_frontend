import { handleAssessmentSubmit } from "@/assessments/plugins/submit/handle-assessment-submit";

/** @deprecated Use `/api/assessment/[slug]/submit` — kept for backwards compatibility. */
export async function POST(request: Request) {
  return handleAssessmentSubmit("prioritisation", request);
}
