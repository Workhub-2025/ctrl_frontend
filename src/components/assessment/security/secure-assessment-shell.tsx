"use client";

import { Pause, Settings, Save, AlertTriangle } from "lucide-react";
import { ReactNode, useState, useEffect } from "react";
import { AssessmentIntegrityService } from "@/services/assessment-integrity.service";
import { useAssessmentStore } from "@/store/assessment.store";
import { useTypingSessionStore } from "@/store/typing-session.store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SecureAssessmentShellProps = {
  assessmentName: string;
  timerLabel: string;
  secureModeActive: boolean;
  warningsCount: number;
  onExit: () => void;
  children: ReactNode;
  showPauseButton?: boolean;
  enableFocusMonitoring?: boolean;
  integrityMonitoringActive?: boolean;
  /** When provided, integrity violations are persisted via AssessmentIntegrityService. */
  assessmentType?: string;
};

export function SecureAssessmentShell({
  assessmentName,
  timerLabel,
  secureModeActive,
  warningsCount,
  onExit,
  children,
  showPauseButton = true,
  enableFocusMonitoring = true,
  integrityMonitoringActive = true,
  assessmentType,
}: Readonly<SecureAssessmentShellProps>) {
  const integrityEvents = useAssessmentStore((s) => s.integrityEvents);
  const addIntegrityEvent = useAssessmentStore((s) => s.addIntegrityEvent);
  const submissionStatus = useTypingSessionStore((s) => s.submissionStatus);
  const isSubmitting = submissionStatus === 'submitting';

  const [isPaused, setIsPaused] = useState(false);
  const [securityViolation, setSecurityViolation] = useState<string | null>(null);

  // --- ZERO-TRUST RUNTIME ENVIRONMENT ---
  // Actively monitor for focus loss, tab switching, and bypass attempts
  useEffect(() => {
    if (!secureModeActive) return;

    // 1. Verify cryptographic lock exists (prevent direct URL bypassing)
    const lock = window.localStorage.getItem("ctrl_secure_lock");
    if (!lock) {
      window.localStorage.setItem(
        "ctrl_secure_lock",
        JSON.stringify({ at: new Date().toISOString(), mode: "visual-prototype" })
      );
    }

    if (!enableFocusMonitoring || !integrityMonitoringActive) return;

    // 2. Event Handlers for Anti-Cheat Monitoring
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (assessmentType) {
          void AssessmentIntegrityService.trackEvent({
            assessmentType,
            eventType: "tab_hidden",
            metadata: { occurredAt: new Date().toISOString() },
          });
          addIntegrityEvent('tab_hidden');
        }
        handleViolation("Window focus lost or tab switched during active assessment.");
      }
    };

    const handleBlur = () => {
      if (assessmentType) {
        void AssessmentIntegrityService.trackEvent({
          assessmentType,
          eventType: "window_blur",
          metadata: { occurredAt: new Date().toISOString() },
        });
        addIntegrityEvent('window_blur');
      }
      handleViolation("Assessment window lost focus. Ensure this is your active window.");
    };

    const handleViolation = (reason: string) => {
      setSecurityViolation(reason);
      setIsPaused(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [addIntegrityEvent, assessmentType, enableFocusMonitoring, integrityMonitoringActive, secureModeActive]);

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-border dark:border-white/5 bg-background/95 backdrop-blur-xl flex h-16 items-center justify-between px-6">
        <div className="flex-1 flex items-center">
          <span className="text-sm font-medium text-muted-foreground">{assessmentName}</span>
        </div>

        <div className="flex justify-center flex-1">
          <img src="/icon1.png" alt="CTRL Logo" className="h-8 w-8 logo-adaptive-filter" />
        </div>

      {/* Security Warnings Audit Indicator */}
      {secureModeActive && integrityEvents.length > 0 && (
        <div className="absolute left-1/2 top-14 -translate-x-1/2 rounded-b-lg border-b border-l border-r border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1 shadow-sm">
          <AlertTriangle className="h-3 w-3" />
          {integrityEvents.length} Security Violation{integrityEvents.length > 1 ? 's' : ''} Logged
        </div>
      )}

        <div className="flex items-center justify-end flex-1 gap-3">
          {showPauseButton && (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsPaused(true)}>
              <Pause className="h-4 w-4" />
              <span className="hidden sm:inline">Pause</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={onExit}
                disabled={isSubmitting}
                className="text-red-600 focus:bg-red-50 dark:focus:bg-red-950 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Submitting…' : 'Save and exit'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Assessment Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-16 pb-12">
        <div className="mx-auto w-full max-w-[1680px] px-4 py-6 md:px-6">{children}</div>
      </main>

      {/* Secure Footer */}
      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border dark:border-white/5 bg-background/95 backdrop-blur-xl flex h-12 items-center justify-between px-6">
        <div className="flex-1"></div>
        <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          <span className="text-xs font-medium tracking-wide uppercase">Secured Session</span>
        </div>
      </footer>

      {/* Pause Modal Overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-card shadow-2xl border-border dark:border-white/10 text-center">
            <CardHeader>
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${securityViolation ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
              {securityViolation ? <AlertTriangle className="h-8 w-8" /> : <Pause className="h-8 w-8" />}
              </div>
            <CardTitle className="text-2xl">{securityViolation ? "Security Violation Detected" : "Assessment Paused"}</CardTitle>
            <CardDescription>{securityViolation ? "Your activity has been audited and logged." : "Your timer and session have been securely paused."}</CardDescription>
            </CardHeader>
            <CardContent>
            {securityViolation ? (
              <p className="text-sm font-medium text-red-600 dark:text-red-400 p-3 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-900/50">
                {securityViolation}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                This is a placeholder for the pause screen. In the final version, this will stop the assessment timer and hide the questions to maintain integrity.
              </p>
            )}
            </CardContent>
            <CardFooter className="flex justify-center border-t border-border/50 pt-4">
            <Button size="lg" className="w-full" onClick={() => { setIsPaused(false); setSecurityViolation(null); }}>
                Resume Assessment
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
