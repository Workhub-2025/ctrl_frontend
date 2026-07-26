"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { portalDialogShellClass } from "@/components/dashboard/portal/portal-design-tokens";
import {
  completeFirebaseTotpLogin,
  loginWithFirebase,
} from "@/lib/firebase-auth-browser";
import {
  beginFirebaseTotpEnrollment,
  completeFirebaseTotpEnrollment,
  getFirebaseTotpStatus,
  updateFirebaseAccountPassword,
  type FirebaseTotpEnrollment,
} from "@/lib/firebase-totp-browser";
import { cn } from "@/lib/utils";

type Step = "password" | "enrol" | "verify" | "profile";

type AdminFirstLoginSecurityDialogProps = {
  open: boolean;
  email: string;
  onOpenChange?: (open: boolean) => void;
  onCompleted?: (redirectPath: string) => void;
};

async function readData<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: string;
  };
  if (!response.ok || !body.data) {
    throw new Error(body.error ?? "Request failed");
  }
  return body.data;
}

export function AdminFirstLoginSecurityDialog({
  open,
  email,
  onOpenChange,
  onCompleted,
}: AdminFirstLoginSecurityDialogProps) {
  const [step, setStep] = useState<Step>("password");
  const [displayName, setDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [enrollment, setEnrollment] = useState<FirebaseTotpEnrollment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    try {
      if (getFirebaseTotpStatus().totpEnabled) {
        setStep("verify");
      } else {
        setStep("password");
      }
    } catch {
      setStep("password");
    }
  }, [open]);

  const savePasswordAndContinue = async () => {
    setBusy(true);
    setError(null);
    try {
      if (newPassword || confirmPassword) {
        if (newPassword !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        await updateFirebaseAccountPassword(newPassword);
        setLoginPassword(newPassword);
      }
      setEnrollment(await beginFirebaseTotpEnrollment({ accountName: email }));
      setStep("enrol");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  };

  const skipPasswordAndContinue = async () => {
    setBusy(true);
    setError(null);
    try {
      setEnrollment(await beginFirebaseTotpEnrollment({ accountName: email }));
      setStep("enrol");
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Could not start authenticator setup");
    } finally {
      setBusy(false);
    }
  };

  const completeEnrollment = async () => {
    setBusy(true);
    setError(null);
    try {
      await completeFirebaseTotpEnrollment(totpCode, { signOutAfter: true });
      setTotpCode("");
      setStep("verify");
    } catch (enrolError) {
      setError(enrolError instanceof Error ? enrolError.message : "Code could not be verified");
    } finally {
      setBusy(false);
    }
  };

  const confirmWithAuthenticator = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!loginPassword.trim()) {
        throw new Error("Enter your account password to confirm the authenticator");
      }
      const passwordLogin = await loginWithFirebase(email, loginPassword);
      if (!passwordLogin.requiresTotp) {
        throw new Error("Authenticator confirmation is required after enrolment");
      }
      const verified = await completeFirebaseTotpLogin(totpCode);
      if (verified.requiresTotp) {
        throw new Error("Additional verification is required");
      }
      setTotpCode("");
      setStep("profile");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Could not confirm authenticator");
    } finally {
      setBusy(false);
    }
  };

  const createAdministrator = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await readData<{ redirectPath: string }>(
        await fetch("/api/bootstrap/administrator", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ displayName }),
        }),
      );
      onCompleted?.(result.redirectPath);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Administrator could not be created");
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          portalDialogShellClass,
          "max-h-[90dvh] w-[min(92vw,34rem)] max-w-lg gap-0 overflow-y-auto p-0 sm:rounded-2xl [&>button]:hidden",
        )}
        onPointerDownOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        <DialogHeader className="space-y-2 border-b border-border/60 px-6 py-5 text-left">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            Secure your administrator account
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            First-time setup stays on this screen: optional password change,
            authenticator enrolment, confirmation, then administrator creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 py-5">
          {error ? (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {step === "password" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Optionally set a new password now, before authenticator enrolment.
                You can skip this if the password you already used is the one you want.
              </p>
              <div className="space-y-2">
                <Label htmlFor="first-login-new-password">New password</Label>
                <Input
                  id="first-login-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first-login-confirm-password">Confirm password</Label>
                <Input
                  id="first-login-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
            </div>
          ) : null}

          {step === "enrol" && enrollment ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add this key to your authenticator app, then enter the current six-digit code.
              </p>
              <div className="space-y-2">
                <Label>Manual setup key</Label>
                <div className="flex gap-2">
                  <Input readOnly value={enrollment.secretKey} className="font-mono text-sm" />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Copy setup key"
                    onClick={() => void navigator.clipboard.writeText(enrollment.secretKey)}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="first-login-enrol-code">Authenticator code</Label>
                <Input
                  id="first-login-enrol-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value)}
                />
              </div>
            </div>
          ) : null}

          {step === "verify" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sign in once with your password and authenticator code so CTRL can
                create the administrator with a verified second factor.
              </p>
              <div className="space-y-2">
                <Label htmlFor="first-login-current-password">Password</Label>
                <Input
                  id="first-login-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="first-login-verify-code">Authenticator code</Label>
                <Input
                  id="first-login-verify-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value)}
                />
              </div>
            </div>
          ) : null}

          {step === "profile" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Authenticator confirmed. Create the staged administrator profile to finish.
              </p>
              <div className="space-y-2">
                <Label htmlFor="first-login-display-name">Your name</Label>
                <Input
                  id="first-login-display-name"
                  autoComplete="name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2 border-t border-border/60 px-6 py-4 sm:justify-between">
          {step === "password" ? (
            <>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => void skipPasswordAndContinue()}>
                Keep current password
              </Button>
              <Button type="button" disabled={busy} onClick={() => void savePasswordAndContinue()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continue to authenticator
              </Button>
            </>
          ) : null}
          {step === "enrol" ? (
            <Button
              type="button"
              className="ml-auto"
              disabled={busy || totpCode.trim().length < 6}
              onClick={() => void completeEnrollment()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Verify and continue
            </Button>
          ) : null}
          {step === "verify" ? (
            <Button
              type="button"
              className="ml-auto"
              disabled={busy || loginPassword.trim().length < 8 || totpCode.trim().length < 6}
              onClick={() => void confirmWithAuthenticator()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirm authenticator
            </Button>
          ) : null}
          {step === "profile" ? (
            <Button
              type="button"
              className="ml-auto"
              disabled={busy || displayName.trim().length < 2}
              onClick={() => void createAdministrator()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create administrator
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
