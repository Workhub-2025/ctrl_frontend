"use client";

import { SecureAssessmentShell, SituationalJudgementTest } from "@/components/assessment";
import { useSecureExit } from "@/hooks/use-secure-exit";
import { useSearchParams } from "next/navigation";
import type { AssessmentPageProps } from "./types";

/**
 * SituationalJudgementPage
 *
 * The dedicated secure route for the Situational Judgement Test.
 */
export default function SituationalJudgementAssessmentPage(_props: AssessmentPageProps) {
  const { handleExit } = useSecureExit();
  const searchParams = useSearchParams();
  const candidateSessionDocumentId = searchParams.get("candidateSessionDocumentId");

  return (
    <SecureAssessmentShell
      assessmentName="Situational Judgement Assessment"
      timerLabel="In Progress"
      secureModeActive={true}
      warningsCount={0}
      onExit={handleExit}
      showPauseButton={false}
      enableFocusMonitoring={false}
    >
      <SituationalJudgementTest candidateSessionDocumentId={candidateSessionDocumentId} />
    </SecureAssessmentShell>
  );
}
