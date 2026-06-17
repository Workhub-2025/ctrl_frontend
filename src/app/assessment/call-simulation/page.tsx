import { renderAssessmentPage } from "@/assessments/plugins/render-assessment-page";

export default function CallSimulationPage(props: {
  searchParams?: Promise<{ candidateSessionDocumentId?: string }>;
}) {
  return renderAssessmentPage("call-simulation", props);
}
