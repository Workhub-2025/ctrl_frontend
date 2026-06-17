import { renderAssessmentPage } from "@/assessments/plugins/render-assessment-page";

export default function PrioritisationPage(props: {
  searchParams?: Promise<{ candidateSessionDocumentId?: string }>;
}) {
  return renderAssessmentPage("prioritisation", props);
}
