"use client";

import { SecureAssessmentShell, SituationalJudgementTest } from '@/components/assessment';
import { useSecureExit } from '@/hooks/use-secure-exit';

/**
 * SituationalJudgementPage
 * 
 * The dedicated secure route for the Situational Judgement Test.
 */
export default function SituationalJudgementPage() {
  const { handleExit } = useSecureExit();

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
      <SituationalJudgementTest />
    </SecureAssessmentShell>
  );
}
