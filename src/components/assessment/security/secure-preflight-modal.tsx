"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, X, ShieldAlert, Monitor, Wifi, Keyboard, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { cn } from "@/lib/utils";
import {
  portalAlertInfoClass,
  portalBadgeClass,
  portalIconWrapClass,
  portalPanelClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { UK_LEGAL } from "@/lib/legal/uk-compliance";

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
    <div className={cn(portalPanelClass, "flex items-start gap-3.5 p-3.5")}>
      <div className={cn(portalIconWrapClass, !pass && "border-destructive/20 bg-destructive/10 text-destructive")}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <span className={portalBadgeClass}>
            {pass ? (
              <CheckCircle2 className="mr-1 inline h-3 w-3" aria-hidden="true" />
            ) : (
              <XCircle className="mr-1 inline h-3 w-3" aria-hidden="true" />
            )}
            {pass ? "Pass" : "Fail"}
          </span>
        </div>
        <p className="text-xs leading-normal text-muted-foreground">{detail}</p>
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

    const lockToken = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    window.localStorage.setItem(
      "ctrl_secure_lock",
      JSON.stringify({
        at: new Date().toISOString(),
        token: lockToken,
      })
    );

    const width = window.screen.availWidth;
    const height = window.screen.availHeight;

    const popup = window.open(
      href,
      "SecureAssessmentWindow",
      `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width},height=${height},top=0,left=0`
    );

    if (popup) {
      setSubmitting(false);
      onClose();
    } else {
      alert("Pop-up blocked! Please enable pop-ups for this website in your browser settings to launch the secure assessment.");
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className={cn("ctrl-portal fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200", themeClassName)}>
      <div className={cn(portalPanelClass, "relative z-[101] w-full max-w-2xl p-0 shadow-2xl motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-200")}>
        <div className="flex flex-row items-start justify-between border-b border-border/50 p-6 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary">
              <Lock className="h-3.5 w-3.5" />
              Secure Preflight Check
            </div>
            <h2 className="mt-1 text-2xl font-bold text-foreground">{assessmentName}</h2>
            <p className="text-sm text-muted-foreground">
              Verify your system meets the security constraints before entering the assessment.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="-mr-2 -mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close modal"
          >
            <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </Button>
        </div>

        <div className="space-y-5 p-6 pt-6">
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

          <div className={cn(portalAlertInfoClass, "flex items-start gap-3")}>
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1.5 text-xs leading-normal">
              <p className="font-bold">Automated scoring (UK GDPR Article 22)</p>
              <p className="text-muted-foreground">
                This assessment is scored automatically. Results may be used by your recruiting
                organisation in hiring decisions. You may request human review via your recruiter or{" "}
                {UK_LEGAL.privacyEmail}.
              </p>
            </div>
          </div>

          <div className={cn(portalAlertInfoClass, "mt-4 flex items-start gap-3")}>
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1.5 text-xs leading-normal">
              <p className="font-bold">Important Security Notice:</p>
              <p className="text-muted-foreground">
                Upon launch, the assessment opens in a dedicated fullscreen window. Switching tabs, losing focus, or exiting fullscreen pauses the test immediately and audits the action.
              </p>
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer select-none items-start gap-3 text-sm text-foreground/80">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border text-primary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-xs leading-normal text-muted-foreground">
              I acknowledge the security policies, including active fullscreen lockdown, cursor trap focus, and keyboard shortcut monitoring.
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-3 border-t border-border/50 p-6 pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={submitting}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleEnterSecureMode}
            disabled={!canProceed || !acknowledged || submitting}
            className="font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {submitting ? "Initializing Secure Popout…" : "Enter Secure Assessment"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
