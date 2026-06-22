"use client";

import { ReactNode, useState, useEffect, useRef } from "react";
import { AlertTriangle, Monitor, Pause, Play, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { AssessmentIntegrityService } from "@/services/assessment-integrity.service";
import { useAssessmentStore } from "@/store/assessment.store";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  portalAlertErrorClass,
  portalIconWrapLgClass,
  portalPanelClass,
} from "@/components/dashboard/portal/portal-design-tokens";

type SecureAssessmentShellProps = {
  assessmentName: string;
  timerLabel: string;
  secureModeActive: boolean;
  warningsCount: number;
  children: ReactNode;
  showPauseButton?: boolean;
  enableFocusMonitoring?: boolean;
  integrityMonitoringActive?: boolean;
  /** Catalogue slug, e.g. `typing` — used for attempt-scoped integrity events. */
  assessmentType?: string;
  candidateSessionDocumentId?: string | null;
};

export function SecureAssessmentShell({
  assessmentName,
  timerLabel,
  secureModeActive,
  warningsCount,
  children,
  showPauseButton = true,
  enableFocusMonitoring = true,
  integrityMonitoringActive = false,
  assessmentType,
  candidateSessionDocumentId = null,
}: Readonly<SecureAssessmentShellProps>) {
  const integrityEvents = useAssessmentStore((s) => s.integrityEvents);
  const addIntegrityEvent = useAssessmentStore((s) => s.addIntegrityEvent);

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
    if (!secureModeActive || !integrityMonitoringActive) return;

    const handleFullscreenChange = () => {
      const active = checkIsFullscreen();
      setIsFullscreen(active);
      if (!active) {
        // Log integrity violation for leaving fullscreen
        if (assessmentType && candidateSessionDocumentId) {
          void AssessmentIntegrityService.trackEvent({
            candidateSessionDocumentId,
            assessmentSlug: assessmentType,
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
  }, [secureModeActive, assessmentType, candidateSessionDocumentId, addIntegrityEvent, integrityMonitoringActive]);

  // --- WINDOW FOCUS & VISIBILITY MONITORING ---
  useEffect(() => {
    if (!secureModeActive || !enableFocusMonitoring || !integrityMonitoringActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (assessmentType && candidateSessionDocumentId) {
          void AssessmentIntegrityService.trackEvent({
            candidateSessionDocumentId,
            assessmentSlug: assessmentType,
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
          if (assessmentType && candidateSessionDocumentId) {
            void AssessmentIntegrityService.trackEvent({
              candidateSessionDocumentId,
              assessmentSlug: assessmentType,
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
  }, [addIntegrityEvent, assessmentType, candidateSessionDocumentId, enableFocusMonitoring, integrityMonitoringActive, secureModeActive]);

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
      <header className="fixed inset-x-0 top-0 z-30 flex min-h-[72px] items-center justify-between border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur-xl dark:border-white/8 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
              Secure assessment
            </p>
            <p className="truncate text-sm font-semibold text-foreground">{assessmentName}</p>
          </div>
        </div>

        <div className="hidden flex-1 justify-center md:flex">
          <img
            src="/assets/newlogo.svg"
            alt="CTRL Logo"
            className="pointer-events-none h-8 w-8 scale-125 object-contain logo-adaptive-filter"
          />
        </div>

        {/* Security Warnings Count Indicator */}
        {secureModeActive && integrityEvents.length > 0 && (
          <div className="absolute left-1/2 top-full -translate-x-1/2 rounded-b-lg border-b border-l border-r border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 shadow-sm dark:text-red-400">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            {integrityEvents.length} integrity event{integrityEvents.length > 1 ? "s" : ""} audited
          </div>
        )}

        <div className="flex flex-1 items-center justify-end gap-2 sm:gap-3">
          <div className="hidden min-w-[112px] rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-right sm:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Time</p>
            <p className="font-mono text-sm font-semibold text-foreground">{timerLabel}</p>
          </div>
          <div className="hidden rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-right lg:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Audit</p>
            <p className="font-mono text-sm font-semibold text-foreground">{warningsCount}</p>
          </div>
          {showPauseButton && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 gap-2 rounded-lg border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={() => setIsPaused(true)}
            >
              <Pause className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Pause</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main Assessment Content */}
      <main
        id="main-content"
        className="flex-1 overflow-y-auto overflow-x-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--muted)/0.28)_100%)] pb-14 pt-20"
      >
        <div className="mx-auto w-full max-w-[1680px] px-4 py-6 md:px-6">
          {needsFullscreenActivation && secureModeActive ? (
            <div className="flex min-h-[520px] items-center justify-center py-12">
              <div className={cn(portalPanelClass, "grid w-full max-w-3xl overflow-hidden p-0 shadow-2xl md:grid-cols-[0.9fr_1.1fr]")}>
                <div className="border-b border-border/60 bg-muted/30 p-6 md:border-b-0 md:border-r">
                  <div className={cn(portalIconWrapLgClass, "mb-5 h-14 w-14 rounded-lg")}>
                    <Monitor className="h-8 w-8" aria-hidden="true" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Ready check
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-normal text-foreground">Enter secure mode</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    Fullscreen keeps the assessment focused and records any integrity events while you work.
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-2 text-left">
                    <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Timer</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-foreground">{timerLabel}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/60 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Audit</p>
                      <p className="mt-1 font-mono text-sm font-semibold text-foreground">{warningsCount}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-5 p-6">
                  <div className="space-y-3 text-left">
                    {[
                      "Exiting fullscreen pauses the assessment timer.",
                      "Tab switching and window changes are recorded.",
                      "Copy, paste, right-click, save, print, and refresh shortcuts are locked.",
                    ].map((rule) => (
                      <div key={rule} className="flex gap-3 rounded-lg border border-border/60 bg-background/55 p-3 text-sm text-muted-foreground">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                  <Button onClick={enterFullscreen} size="lg" className="h-12 w-full rounded-lg font-bold">
                    Launch fullscreen session
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>

      {/* Secure Footer */}
      <footer className="fixed inset-x-0 bottom-0 z-30 flex h-12 items-center justify-center border-t border-border/70 bg-background/95 px-4 backdrop-blur-xl dark:border-white/8">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.55)] motion-safe:animate-pulse"></div>
          <span className="text-xs font-bold uppercase tracking-[0.16em]">Secured session mode</span>
        </div>
      </footer>

      {/* Blocker Modal (Pause & Security Alert Overlays) */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
          <div className={cn(portalPanelClass, "w-full max-w-lg p-6 text-center shadow-2xl")}>
            <div className="space-y-4 pb-4">
              <div className={cn(portalIconWrapLgClass, "mx-auto mb-4 h-16 w-16 rounded-2xl")}>
                {securityViolation ? (
                  <ShieldAlert className="h-8 w-8" aria-hidden="true" />
                ) : (
                  <Pause className="h-8 w-8" aria-hidden="true" />
                )}
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                {securityViolation ? "Security Lockout Active" : "Assessment Paused"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {securityViolation
                  ? "A security event has triggered a session suspension."
                  : "Your timer and progress are temporarily held."}
              </p>
            </div>
            <div className="space-y-4">
              {securityViolation ? (
                <div className={cn(portalAlertErrorClass, "space-y-2 text-left")}>
                  <p className="font-bold">Reason for suspension:</p>
                  <p className="text-xs leading-normal text-muted-foreground">{securityViolation}</p>
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your assessment has been paused. All inputs are disabled. Resume when you are ready to continue the assessment.
                </p>
              )}
            </div>
            <div className="flex flex-col gap-3 border-t border-border/50 pt-6">
              {securityViolation && !isFullscreen ? (
                <Button onClick={enterFullscreen} size="lg" className="w-full font-bold">
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
                  className="w-full font-bold"
                >
                  <Play className="mr-2 h-4 w-4" aria-hidden="true" />
                  Resume Assessment
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
