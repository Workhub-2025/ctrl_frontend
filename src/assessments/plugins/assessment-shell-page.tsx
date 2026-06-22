"use client";

import { SecureAssessmentShell } from "@/components/assessment";
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
  const plugin = getAssessmentUiPlugin(assessmentSlug);

  if (!plugin) {
    return null;
  }

  const AssessmentComponent = plugin.component;

  return (
    <SecureAssessmentShell
      assessmentName={assessmentName}
      assessmentType={assessmentSlug}
      candidateSessionDocumentId={candidateSessionDocumentId}
      timerLabel="In Progress"
      secureModeActive
      warningsCount={0}
      showPauseButton={false}
      enableFocusMonitoring={false}
    >
      <AssessmentComponent candidateSessionDocumentId={candidateSessionDocumentId} />
    </SecureAssessmentShell>
  );
}
