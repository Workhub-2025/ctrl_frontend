"use client";

import { useEffect, useState } from 'react';
import { SecureAssessmentShell, TypingTest } from '@/components/assessment';
import { useSecureExit } from '@/hooks/use-secure-exit';
import { useTypingSessionStore } from '@/store/typing-session.store';
import type { TypingSessionData } from '@/store/typing-session.store';

interface TypingTestClientProps {
  initialSession: TypingSessionData | null;
  candidateSessionDocumentId?: string | null;
}

/**
 * TypingTestClient
 *
 * Client-side wrapper for the Typing Test page. Hydrates the typing session
 * (texts + config) into useTypingSessionStore on mount. TypingTest and
 * SecureAssessmentShell read from the store directly — no prop-drilling.
 */
export function TypingTestClient({
  initialSession,
  candidateSessionDocumentId,
}: Readonly<TypingTestClientProps>) {
  const { handleExit } = useSecureExit();
  const setSession = useTypingSessionStore((s) => s.setSession);
  const [integrityMonitoringActive, setIntegrityMonitoringActive] = useState(false);

  useEffect(() => {
    if (initialSession) {
      setSession(initialSession);
    }
  }, [initialSession, setSession]);

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
      integrityMonitoringActive={integrityMonitoringActive}
    >
      <TypingTest
        enableAutoSave={true}
        candidateSessionDocumentId={candidateSessionDocumentId}
        onIntegrityMonitoringChange={setIntegrityMonitoringActive}
      />
    </SecureAssessmentShell>
  );
}
