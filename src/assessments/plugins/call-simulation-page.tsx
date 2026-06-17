"use client";

import { CallSimulationTest, SecureAssessmentShell } from "@/components/assessment";
import { useSecureExit } from "@/hooks/use-secure-exit";
import { useSearchParams } from "next/navigation";
import type { AssessmentPageProps } from "./types";

/**
 * CallSimulationPage
 *
 * The dedicated secure route for the Audio Call Simulation assessment.
 */
export default function CallSimulationAssessmentPage(_props: AssessmentPageProps) {
  const { handleExit } = useSecureExit();
  const searchParams = useSearchParams();
  const candidateSessionDocumentId = searchParams.get("candidateSessionDocumentId");

  return (
    <SecureAssessmentShell
      assessmentName="Call Simulation"
      timerLabel="In Progress"
      secureModeActive={true}
      warningsCount={0}
      onExit={handleExit}
      showPauseButton={false}
      enableFocusMonitoring={false}
    >
      <CallSimulationTest candidateSessionDocumentId={candidateSessionDocumentId} />
    </SecureAssessmentShell>
  );
}
