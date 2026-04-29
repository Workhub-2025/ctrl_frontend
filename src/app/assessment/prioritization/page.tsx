"use client";

import PrioritizationTest from '@/components/assessment/prioritization-test';
import { SecureAssessmentShell } from '@/components/assessment/secure-assessment-shell';
import { useSecureExit } from '@/hooks/use-secure-exit';

export default function PrioritizationPage() {
  const { handleExit } = useSecureExit();

  return (
    <SecureAssessmentShell
      assessmentName="Prioritization Assessment"
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
