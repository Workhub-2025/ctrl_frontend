"use client";

import { SecureAssessmentShell, TypingTest } from '@/components/assessment';
import { useSecureExit } from '@/hooks/use-secure-exit';

/**
 * TypingTestPage
 * 
 * The dedicated route for the Typing Speed & Accuracy Test. Wraps the test
 * inside the SecureAssessmentShell to enforce the secure environment.
 */
export default function TypingTestPage() {
  const { handleExit } = useSecureExit();

  return (
    <SecureAssessmentShell
      assessmentName="Typing Speed & Accuracy Test"
      timerLabel="In Progress"
      secureModeActive={true}
      warningsCount={0}
      onExit={handleExit}
      showPauseButton={false}
      enableFocusMonitoring={false}
    >
      <TypingTest enableAutoSave={false} />
    </SecureAssessmentShell>
  );
}
