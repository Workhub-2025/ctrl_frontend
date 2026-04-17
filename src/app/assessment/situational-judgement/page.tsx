"use client";

import SituationalJudgementTest from '@/components/assessment/situational-judgement-test';
import { SecureAssessmentShell } from '@/components/assessment/secure-assessment-shell';
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
      assessmentName="Situational Judgement Test"
      timerLabel="In Progress"
      secureModeActive={true}
      warningsCount={0}
      onExit={handleExit}
    >
      <div className="mx-auto w-full max-w-4xl">
        <SituationalJudgementTest />
      </div>
    </SecureAssessmentShell>
  );
}
