"use client";

import { SecureAssessmentShell } from "@/components/assessment";
import { useSecureExit } from "@/hooks/use-secure-exit";
import type { AssessmentUiPlugin } from "./types";

type AssessmentShellPageProps = {
  plugin: AssessmentUiPlugin;
  candidateSessionDocumentId: string | null;
};

export function AssessmentShellPage({
  plugin,
  candidateSessionDocumentId,
}: AssessmentShellPageProps) {
  const { handleExit } = useSecureExit();
  const AssessmentComponent = plugin.component;

  return (
    <SecureAssessmentShell
      assessmentName={plugin.shellTitle ?? plugin.title}
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
