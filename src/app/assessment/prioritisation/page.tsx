"use client";

import { PrioritisationTest, SecureAssessmentShell } from '@/components/assessment';
import { useSecureExit } from '@/hooks/use-secure-exit';
import { useSearchParams } from 'next/navigation';

export default function PrioritisationPage() {
  const { handleExit } = useSecureExit();
  const searchParams = useSearchParams();
  const candidateSessionDocumentId = searchParams.get('candidateSessionDocumentId');

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
      <PrioritisationTest candidateSessionDocumentId={candidateSessionDocumentId} />
    </SecureAssessmentShell>
  );
}
