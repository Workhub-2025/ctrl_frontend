"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, ShieldAlert, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function CheckRow({ label, pass, detail }: { label: string; pass: boolean; detail: string }) {
  return (
    <div className="rounded-lg border border-border dark:border-white/5 bg-muted/30 dark:bg-white/[0.02] px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
            pass
              ? "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
          }`}
        >
          {pass ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
          {pass ? "Pass" : "Blocked"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
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
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Mock environment checks
  const [desktopEligible, setDesktopEligible] = useState(true);
  const [fullscreenCapable, setFullscreenCapable] = useState(true);
  const [multiTabReady, setMultiTabReady] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setAcknowledged(false);
      setDesktopEligible(window.innerWidth > 768);
      setFullscreenCapable(document.fullscreenEnabled ?? true);
      
      // Check for existing assessment lock to prevent multi-tab execution
      const existingLock = window.localStorage.getItem('ctrl_secure_lock');
      setMultiTabReady(!existingLock);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canProceed = desktopEligible && fullscreenCapable && multiTabReady;

  const handleEnterSecureMode = () => {
    if (!canProceed || !acknowledged) return;
    setSubmitting(true);
    
    // Set the secure lock so other tabs are blocked
    const lockToken = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
    window.localStorage.setItem('ctrl_secure_lock', JSON.stringify({ 
      at: new Date().toISOString(),
      token: lockToken
    }));

    // Calculate screen dimensions for the popout
    const width = window.screen.availWidth;
    const height = window.screen.availHeight;

    // Open a brand new popup window with no toolbars or location bars
    const popup = window.open(
      href,
      "SecureAssessmentWindow",
      `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width},height=${height},top=0,left=0`
    );

    if (popup) {
      setSubmitting(false);
      onClose(); // Close the modal in the main dashboard window
    } else {
      alert("Pop-up blocked! Please allow pop-ups for this site to launch the secure assessment.");
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl bg-card shadow-2xl border-border dark:border-white/10 animate-in zoom-in-95 duration-200">
        <CardHeader className="flex flex-row items-start justify-between pb-4 border-b border-border/50">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Environment Validation</p>
            <CardTitle className="text-xl">{assessmentName}</CardTitle>
            <CardDescription>Validate execution controls before entering secure mode.</CardDescription>
          </div>
          <Button variant="ghost" size="icon" className="-mr-2 -mt-2" onClick={onClose} disabled={submitting}>
            <X className="h-4 w-4 text-muted-foreground" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-3">
            <CheckRow
              label="Desktop / Laptop Enforcement"
              pass={desktopEligible}
              detail="Touch devices, mobile user agents, and narrow viewports are blocked for secure execution."
            />
            <CheckRow
              label="Fullscreen Capability"
              pass={fullscreenCapable}
              detail="Secure mode requires fullscreen API support before runtime launch."
            />
            <CheckRow
              label="Multi-Tab Session Lock"
              pass={multiTabReady}
              detail={multiTabReady ? "No conflicting active assessment lock detected." : "An active secure assessment is already locked in another tab."}
            />
          </div>

          <label className="mt-6 flex items-start gap-3 text-sm text-foreground/80 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>I acknowledge assessment controls, including fullscreen enforcement, focus monitoring, and audit logging.</span>
          </label>
        </CardContent>
        
        <CardFooter className="flex justify-end gap-3 border-t border-border/50 pt-4">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleEnterSecureMode} disabled={!canProceed || !acknowledged || submitting}>
            {submitting ? "Initializing Secure Mode..." : "Enter Secure Mode"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}