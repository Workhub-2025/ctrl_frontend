import { renderAssessmentPage } from "@/assessments/plugins/render-assessment-page";

export default function SituationalJudgementPage(props: {
  searchParams?: Promise<{ candidateSessionDocumentId?: string }>;
}) {
  return renderAssessmentPage("situational-judgement", props);
}
