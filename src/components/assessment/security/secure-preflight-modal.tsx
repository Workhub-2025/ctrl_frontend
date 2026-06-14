"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, X, ShieldAlert, Monitor, Wifi, Keyboard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { cn } from "@/lib/utils";

function CheckRow({
  label,
  pass,
  detail,
  icon: Icon,
}: {
  label: string;
  pass: boolean;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border border-border/80 dark:border-white/5 bg-muted/40 dark:bg-white/[0.01] p-3.5 flex items-start gap-3.5 transition-all">
      <div className={cn(
        "p-2 rounded-lg shrink-0",
        pass 
          ? "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
          : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              pass
                ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
                : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
            )}
          >
            {pass ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : <XCircle className="h-3 w-3" aria-hidden="true" />}
            {pass ? "Pass" : "Fail"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-normal">{detail}</p>
      </div>
    </div>
  );
}

export function SecurePreflightModal({
  isOpen,
  onClose,
  assessmentName,
  href,
}: {
  isOpen: boolean;
  onClose: () => void;
  assessmentName: string;
  href: string;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Environment states
  const [desktopEligible, setDesktopEligible] = useState(true);
  const [fullscreenCapable, setFullscreenCapable] = useState(true);
  const [networkOnline, setNetworkOnline] = useState(true);

  const { themeClassName } = useAccessibilitySettings({ enabled: true });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setAcknowledged(false);
      setDesktopEligible(window.innerWidth > 768 && !/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent));
      setFullscreenCapable(document.fullscreenEnabled ?? true);
      setNetworkOnline(navigator.onLine ?? true);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const canProceed = desktopEligible && fullscreenCapable && networkOnline;

  const handleEnterSecureMode = () => {
    if (!canProceed || !acknowledged) return;
    setSubmitting(true);

    window.localStorage.removeItem("ctrl_secure_lock");

    // Cryptographic popout token lock
    const lockToken = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    window.localStorage.setItem(
      "ctrl_secure_lock",
      JSON.stringify({
        at: new Date().toISOString(),
        token: lockToken,
      })
    );

    // Calculate maximum available screen size
    const width = window.screen.availWidth;
    const height = window.screen.availHeight;

    // Launch secure popout browser window
    const popup = window.open(
      href,
      "SecureAssessmentWindow",
      `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width},height=${height},top=0,left=0`
    );

    if (popup) {
      setSubmitting(false);
      onClose(); // Close preflight modal in main dashboard
    } else {
      alert("Pop-up blocked! Please enable pop-ups for this website in your browser settings to launch the secure assessment.");
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className={cn("ctrl-portal fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 motion-safe:animate-in motion-safe:fade-in duration-200")}>
      <Card className="relative z-[101] w-full max-w-2xl bg-card shadow-2xl border-border dark:border-white/10 motion-safe:animate-in motion-safe:zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-start justify-between pb-4 border-b border-border/50">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.16em] text-xs">
              <Lock className="h-3.5 w-3.5" />
              Secure Preflight Check
            </div>
            <CardTitle className="text-2xl font-bold mt-1 text-foreground">{assessmentName}</CardTitle>
            <CardDescription className="text-muted-foreground">
              Verify your system meets the security constraints before entering the assessment.
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 -mt-2 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close modal"
          >
            <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-5 pt-6">
          <div className="grid gap-3">
            <CheckRow
              label="Desktop / Laptop Enforcement"
              pass={desktopEligible}
              detail="Mobile operating systems, touch pads, and small portrait viewports are blocked to ensure exam integrity."
              icon={Monitor}
            />
            <CheckRow
              label="Fullscreen Mode Support"
              pass={fullscreenCapable}
              detail="Requires active Browser Fullscreen API support to isolate the session runtime."
              icon={Keyboard}
            />
            <CheckRow
              label="Secure Network Connection"
              pass={networkOnline}
              detail="Verify live connection is online to sync progress telemetry and integrity events."
              icon={Wifi}
            />
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-700 dark:text-amber-400 mt-4 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
            <div className="text-xs space-y-1.5 leading-normal">
              <p className="font-bold">Important Security Notice:</p>
              <p className="text-muted-foreground">
                Upon launch, the assessment opens in a dedicated fullscreen window. Switching tabs, losing focus, or exiting fullscreen pauses the test immediately and audits the action.
              </p>
            </div>
          </div>

          <label className="mt-4 flex items-start gap-3 text-sm text-foreground/80 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:outline-none"
            />
            <span className="text-xs text-muted-foreground leading-normal">
              I acknowledge the security policies, including active fullscreen lockdown, cursor trap focus, and keyboard shortcut monitoring.
            </span>
          </label>
        </CardContent>

        <CardFooter className="flex justify-end gap-3 border-t border-border/50 pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
            className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            Cancel
          </Button>
          <Button
            onClick={handleEnterSecureMode}
            disabled={!canProceed || !acknowledged || submitting}
            className="focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none font-bold"
          >
            {submitting ? "Initializing Secure Popout…" : "Enter Secure Assessment"}
          </Button>
        </CardFooter>
      </Card>
    </div>,
    document.body
  );
}
