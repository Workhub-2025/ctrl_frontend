"use client";

import { CallSimulationTest, SecureAssessmentShell } from '@/components/assessment';
import { useSecureExit } from '@/hooks/use-secure-exit';

/**
 * CallSimulationPage
 * 
 * The dedicated secure route for the Audio Call Simulation assessment.
 */
export default function CallSimulationPage() {
  const { handleExit } = useSecureExit();

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
      <CallSimulationTest />
    </SecureAssessmentShell>
  );
}
