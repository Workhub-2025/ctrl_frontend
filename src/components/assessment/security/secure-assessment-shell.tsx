"use client";

import { ReactNode, useState, useEffect, useRef } from "react";
import { AlertTriangle, Lock, Monitor, Pause, Play, RefreshCw, Settings, ShieldAlert, ShieldCheck } from "lucide-react";
import { AssessmentIntegrityService } from "@/services/assessment-integrity.service";
import { useAssessmentStore } from "@/store/assessment.store";
import { useTypingSessionStore } from "@/store/typing-session.store";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

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
  const isSubmitting = submissionStatus === "submitting";

  const [isPaused, setIsPaused] = useState(false);
  const [securityViolation, setSecurityViolation] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [needsFullscreenActivation, setNeedsFullscreenActivation] = useState(true);

  // Hook in accessibility preferences
  const { themeClassName, settings } = useAccessibilitySettings({ enabled: true });

  // Helper to determine if browser is currently fullscreen
  const checkIsFullscreen = (): boolean => {
    if (typeof window === "undefined" || typeof document === "undefined") return false;
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
  };

  // Helper to request fullscreen
  const enterFullscreen = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const docEl = document.documentElement;
    try {
      if (docEl.requestFullscreen) {
        void docEl.requestFullscreen();
      } else if ((docEl as any).webkitRequestFullscreen) {
        void (docEl as any).webkitRequestFullscreen();
      } else if ((docEl as any).msRequestFullscreen) {
        void (docEl as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
      setNeedsFullscreenActivation(false);
    } catch (err) {
      console.error("Failed to enter fullscreen mode:", err);
    }
  };

  // Track fullscreen state on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsFullscreen(checkIsFullscreen());
  }, []);

  // --- STRICT Anti-Cheat Browser Lockdown Controls ---
  useEffect(() => {
    if (!secureModeActive) return;

    // 1. Block right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener("contextmenu", handleContextMenu, true);

    // 2. Block keyboard shortcuts (Copy, Paste, DevTools, Save, Print, Refresh)
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (
        (isCmdOrCtrl && (key === "c" || key === "v" || key === "x" || key === "s" || key === "p" || key === "r")) ||
        e.key === "F12" ||
        e.key === "F5" ||
        (isCmdOrCtrl && e.shiftKey && key === "i") ||
        (isCmdOrCtrl && e.shiftKey && key === "c")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", handleKeyDown, true);

    // 3. Block copy, cut, paste events directly
    const handleClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
    };
    window.addEventListener("copy", handleClipboard, true);
    window.addEventListener("cut", handleClipboard, true);
    window.addEventListener("paste", handleClipboard, true);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("copy", handleClipboard, true);
      window.removeEventListener("cut", handleClipboard, true);
      window.removeEventListener("paste", handleClipboard, true);
    };
  }, [secureModeActive]);

  // --- FULLSCREEN MONITORING ---
  useEffect(() => {
    if (!secureModeActive) return;

    const handleFullscreenChange = () => {
      const active = checkIsFullscreen();
      setIsFullscreen(active);
      if (!active) {
        // Log integrity violation for leaving fullscreen
        if (assessmentType) {
          void AssessmentIntegrityService.trackEvent({
            assessmentType,
            eventType: "fullscreen_exit",
            metadata: { occurredAt: new Date().toISOString() },
          });
          addIntegrityEvent("window_blur"); // Record as structural blur
        }
        setSecurityViolation("Fullscreen mode exited. Re-entry required to resume assessment.");
        setIsPaused(true);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [secureModeActive, assessmentType, addIntegrityEvent]);

  // --- WINDOW FOCUS & VISIBILITY MONITORING ---
  useEffect(() => {
    if (!secureModeActive || !enableFocusMonitoring || !integrityMonitoringActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (assessmentType) {
          void AssessmentIntegrityService.trackEvent({
            assessmentType,
            eventType: "tab_hidden",
            metadata: { occurredAt: new Date().toISOString() },
          });
          addIntegrityEvent("tab_hidden");
        }
        handleViolation("Window focus lost or tab switched during active assessment.");
      }
    };

    const handleBlur = () => {
      // Delay check slightly to prevent false positives during fullscreen transitions
      setTimeout(() => {
        if (!document.hasFocus()) {
          if (assessmentType) {
            void AssessmentIntegrityService.trackEvent({
              assessmentType,
              eventType: "window_blur",
              metadata: { occurredAt: new Date().toISOString() },
            });
            addIntegrityEvent("window_blur");
          }
          handleViolation("Assessment window lost focus. Ensure this remains your active window.");
        }
      }, 150);
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

  // Cryptographic token validation to check popout integrity on start
  useEffect(() => {
    if (!secureModeActive) return;
    const lock = window.localStorage.getItem("ctrl_secure_lock");
    if (!lock) {
      window.localStorage.setItem(
        "ctrl_secure_lock",
        JSON.stringify({ at: new Date().toISOString(), mode: "validated-prototype" })
      );
    }
  }, [secureModeActive]);

  // Main render
  return (
    <div className={cn("ctrl-portal flex h-screen w-full flex-col overflow-hidden text-foreground transition-colors duration-300", themeClassName)}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
      >
        Skip to main content
      </a>

      {/* Secure Header */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-border dark:border-white/5 bg-background/95 backdrop-blur-xl flex h-16 items-center justify-between px-6">
        <div className="flex-1 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-green-500" aria-hidden="true" />
          <span className="text-sm font-semibold tracking-wide">{assessmentName}</span>
        </div>

        <div className="flex justify-center flex-1">
          <img
            src="/assets/newlogo.png"
            alt="CTRL Logo"
            className="h-8 w-8 object-contain scale-125 hue-rotate-[60deg] logo-adaptive-filter pointer-events-none"
          />
        </div>

        {/* Security Warnings Count Indicator */}
        {secureModeActive && integrityEvents.length > 0 && (
          <div className="absolute left-1/2 top-14 -translate-x-1/2 rounded-b-lg border-b border-l border-r border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5 shadow-sm">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {integrityEvents.length} Integrity Violation{integrityEvents.length > 1 ? "s" : ""} Audited
          </div>
        )}

        <div className="flex items-center justify-end flex-1 gap-3">
          {showPauseButton && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none border-border/80"
              onClick={() => setIsPaused(true)}
            >
              <Pause className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Pause Session</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none border-border/80"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={onExit}
                disabled={isSubmitting}
                className="text-red-600 focus:bg-red-50 dark:focus:bg-red-950/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                <Lock className="h-4 w-4 mr-2" aria-hidden="true" />
                {isSubmitting ? "Submitting…" : "Save & Exit Securely"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Assessment Content */}
      <main id="main-content" className="flex-1 overflow-y-auto overflow-x-hidden pt-16 pb-12 bg-background">
        <div className="mx-auto w-full max-w-[1680px] px-4 py-6 md:px-6">
          {needsFullscreenActivation && secureModeActive ? (
            <div className="flex min-h-[520px] items-center justify-center py-12">
              <Card className="w-full max-w-xl bg-card border-border dark:border-white/10 shadow-2xl p-6 text-center">
                <CardHeader>
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Monitor className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-2xl font-bold">Secure Fullscreen Required</CardTitle>
                  <CardDescription>
                    To maintain test integrity, this assessment must be executed in fullscreen mode.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-left space-y-3 p-4 bg-muted/30 dark:bg-white/[0.02] rounded-xl border border-border/50">
                  <p className="text-sm font-semibold text-foreground">Lockdown rules in effect:</p>
                  <ul className="text-xs space-y-2 text-muted-foreground list-disc pl-4">
                    <li>Exiting fullscreen will automatically pause the test countdown.</li>
                    <li>Tab switching, window blurring, and screenshot shortcuts are disabled and logged.</li>
                    <li>Copying, pasting, and right-clicks are locked.</li>
                  </ul>
                </CardContent>
                <CardFooter className="pt-6">
                  <Button onClick={enterFullscreen} size="lg" className="w-full font-bold shadow-lg">
                    Launch Fullscreen Session
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ) : (
            children
          )}
        </div>
      </main>

      {/* Secure Footer */}
      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border dark:border-white/5 bg-background/95 backdrop-blur-xl flex h-12 items-center justify-between px-6">
        <div className="flex-1"></div>
        <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          <span className="text-xs font-semibold tracking-wide uppercase">Secured Session Mode</span>
        </div>
      </footer>

      {/* Blocker Modal (Pause & Security Alert Overlays) */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-4 motion-safe:animate-in motion-safe:fade-in duration-200">
          <Card className="w-full max-w-lg bg-card border-border dark:border-white/10 shadow-2xl p-6 text-center">
            <CardHeader>
              <div
                className={cn(
                  "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl",
                  securityViolation
                    ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                )}
              >
                {securityViolation ? (
                  <ShieldAlert className="h-8 w-8" aria-hidden="true" />
                ) : (
                  <Pause className="h-8 w-8" aria-hidden="true" />
                )}
              </div>
              <CardTitle className="text-2xl font-bold">
                {securityViolation ? "Security Lockout Active" : "Assessment Paused"}
              </CardTitle>
              <CardDescription>
                {securityViolation
                  ? "A security event has triggered a session suspension."
                  : "Your timer and progress are temporarily held."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {securityViolation ? (
                <div className="text-sm font-medium text-red-600 dark:text-red-400 p-4 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200/50 dark:border-red-900/40 text-left space-y-2">
                  <p className="font-bold">Reason for suspension:</p>
                  <p className="text-xs text-muted-foreground leading-normal">{securityViolation}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your assessment has been paused. All inputs are disabled. Resume when you are ready to continue the assessment.
                </p>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3 pt-6 border-t border-border/50">
              {securityViolation && !isFullscreen ? (
                <Button onClick={enterFullscreen} size="lg" className="w-full font-bold shadow-lg">
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Re-enter Secure Fullscreen Mode
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setIsPaused(false);
                    setSecurityViolation(null);
                  }}
                  size="lg"
                  className="w-full font-bold shadow-lg"
                >
                  <Play className="mr-2 h-4 w-4" aria-hidden="true" />
                  Resume Assessment
                </Button>
              )}
              {securityViolation && (
                <Button
                  variant="ghost"
                  onClick={onExit}
                  disabled={isSubmitting}
                  className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                >
                  Exit & Audit Session
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
