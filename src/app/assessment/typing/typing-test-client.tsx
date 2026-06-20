"use client";

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { SecureAssessmentShell, TypingTest } from '@/components/assessment';
import { Button } from '@/components/ui/button';
import { useSecureExit } from '@/hooks/use-secure-exit';
import { useTypingSessionStore } from '@/store/typing-session.store';
import type { TypingSessionData } from '@/store/typing-session.store';

interface TypingTestClientProps {
  initialSession: (TypingSessionData & { error?: string }) | null;
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
  const { handleExit } = useSecureExit(candidateSessionDocumentId);
  const setSession = useTypingSessionStore((s) => s.setSession);
  const [integrityMonitoringActive, setIntegrityMonitoringActive] = useState(false);

  useEffect(() => {
    if (initialSession && !initialSession.error) {
      setSession(initialSession);
    }
  }, [initialSession, setSession]);

  const error = initialSession?.error ?? null;

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-4 text-center bg-background text-foreground">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-bold">Failed to load assessment</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-6 h-10 px-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <SecureAssessmentShell
      assessmentName="Typing Speed & Accuracy Test"
      assessmentType="typing"
      candidateSessionDocumentId={candidateSessionDocumentId}
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
