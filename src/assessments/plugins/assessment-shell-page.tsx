"use client";

import { SecureAssessmentShell } from "@/components/assessment";
import { useSecureExit } from "@/hooks/use-secure-exit";
import { getAssessmentUiPlugin } from "./registry";

type AssessmentShellPageProps = {
  assessmentSlug: string;
  assessmentName: string;
  candidateSessionDocumentId: string | null;
};

export function AssessmentShellPage({
  assessmentSlug,
  assessmentName,
  candidateSessionDocumentId,
}: AssessmentShellPageProps) {
  const { handleExit } = useSecureExit(candidateSessionDocumentId);
  const plugin = getAssessmentUiPlugin(assessmentSlug);

  if (!plugin) {
    return null;
  }

  const AssessmentComponent = plugin.component;

  return (
    <SecureAssessmentShell
      assessmentName={assessmentName}
      assessmentType={assessmentSlug}
      timerLabel="In Progress"
      secureModeActive
      warningsCount={0}
      onExit={handleExit}
      showPauseButton={false}
      enableFocusMonitoring={false}
    >
      <AssessmentComponent candidateSessionDocumentId={candidateSessionDocumentId} />
    </SecureAssessmentShell>
  );
}
