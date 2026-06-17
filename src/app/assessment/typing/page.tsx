import { renderAssessmentPage } from "@/assessments/plugins/render-assessment-page";

export default function TypingTestPage(props: {
  searchParams?: Promise<{ candidateSessionDocumentId?: string }>;
}) {
  return renderAssessmentPage("typing", props);
}
