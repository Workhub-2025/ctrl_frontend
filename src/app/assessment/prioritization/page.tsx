"use client";

import { PrioritizationTest, SecureAssessmentShell } from '@/components/assessment';
import { useSecureExit } from '@/hooks/use-secure-exit';

export default function PrioritizationPage() {
  const { handleExit } = useSecureExit();

  return (
    <SecureAssessmentShell
      assessmentName="Prioritisation Judgement Assessment"
      timerLabel="In Progress"
      secureModeActive={true}
      warningsCount={0}
      onExit={handleExit}
      showPauseButton={false}
      enableFocusMonitoring={false}
    >
      <PrioritizationTest />
    </SecureAssessmentShell>
  );
}
