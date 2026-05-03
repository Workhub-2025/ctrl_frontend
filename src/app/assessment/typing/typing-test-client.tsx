"use client";

import { SecureAssessmentShell, TypingTest } from '@/components/assessment';
import { useSecureExit } from '@/hooks/use-secure-exit';
import type { TypingRun } from '@/app/actions/assessment-typing-texts.actions';

interface TypingTestClientProps {
  initialRuns: TypingRun[];
}

/**
 * TypingTestClient
 *
 * Client-side wrapper for the Typing Test page. Handles the secure exit logic
 * and passes pre-fetched Strapi runs down to the TypingTest component.
 */
export function TypingTestClient({ initialRuns }: Readonly<TypingTestClientProps>) {
  const { handleExit } = useSecureExit();

  return (
    <SecureAssessmentShell
      assessmentName="Typing Speed & Accuracy Test"
      assessmentType="typing"
      timerLabel="In Progress"
      secureModeActive={true}
      warningsCount={0}
      onExit={handleExit}
      showPauseButton={false}
      enableFocusMonitoring={true}
    >
      <TypingTest enableAutoSave={true} initialRuns={initialRuns} />
    </SecureAssessmentShell>
  );
}
