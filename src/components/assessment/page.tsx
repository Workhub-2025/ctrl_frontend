"use client";

import PrioritizationTest from '@/components/assessment/prioritization-test';
import { SecureAssessmentShell } from '@/components/assessment/secure-assessment-shell';
import { useSecureExit } from '@/hooks/use-secure-exit';

/**
 * PrioritizationPage
 * 
 * The dedicated secure route for the Incident Prioritization assessment.
 */
export default function PrioritizationPage() {
  const { handleExit } = useSecureExit();

  return (
    <SecureAssessmentShell
      assessmentName="Prioritization Assessment"
      timerLabel="In Progress"
      secureModeActive={true}
      warningsCount={0}
      onExit={handleExit}
    >
      <div className="mx-auto w-full max-w-4xl">
        <PrioritizationTest />
      </div>
    </SecureAssessmentShell>
  );
}