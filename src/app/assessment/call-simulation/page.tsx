"use client";

import CallSimulationTest from '@/components/assessment/call-simulation-test';
import { SecureAssessmentShell } from '@/components/assessment/secure-assessment-shell';
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
