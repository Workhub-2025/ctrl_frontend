"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import {
  AuthenticatorUnlockError,
  beginFirebaseTotpEnrollment,
  completeFirebaseTotpEnrollment,
  disableFirebaseTotp,
  getFirebaseTotpStatus,
  hasAuthenticatorBrowserSession,
  unlockAuthenticatorManagement,
  type FirebaseTotpEnrollment,
  type FirebaseTotpStatus,
} from "@/lib/firebase-totp-browser";

export function FirebaseTotpSecurityPanel({
  continueHref,
  reauthenticateHref = "/auth/login?message=Sign+in+again+with+your+authenticator+code+to+finish+setup.",
}: {
  continueHref: string;
  reauthenticateHref?: string;
}) {
  const { user } = useAuth();
  const accountEmail = user?.email?.trim() ?? "";

  const [status, setStatus] = useState<FirebaseTotpStatus | null>(null);
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [needsTotpForUnlock, setNeedsTotpForUnlock] = useState(false);
  const [password, setPassword] = useState("");
  const [unlockTotpCode, setUnlockTotpCode] = useState("");
  const [enrollment, setEnrollment] = useState<FirebaseTotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAuthenticatorBrowserSession()) {
      setNeedsUnlock(true);
      setStatus(null);
      return;
    }
    try {
      setStatus(getFirebaseTotpStatus());
      setNeedsUnlock(false);
    } catch (loadError) {
      setNeedsUnlock(true);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Confirm your password to manage authenticator settings.",
      );
    }
  }, []);

  const unlock = async () => {
    setBusy(true);
    setError(null);
    try {
      const next = await unlockAuthenticatorManagement({
        email: accountEmail,
        password,
        totpCode: needsTotpForUnlock ? unlockTotpCode : undefined,
      });
      setStatus(next);
      setNeedsUnlock(false);
      setNeedsTotpForUnlock(false);
      setPassword("");
      setUnlockTotpCode("");
    } catch (unlockError) {
      if (
        unlockError instanceof AuthenticatorUnlockError &&
        unlockError.code === "totp_required"
      ) {
        setNeedsTotpForUnlock(true);
        setError(unlockError.message);
      } else {
        setError(
          unlockError instanceof Error
            ? unlockError.message
            : "Could not confirm your identity",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const begin = async () => {
    setBusy(true);
    setError(null);
    try {
      setEnrollment(await beginFirebaseTotpEnrollment({
        accountName: accountEmail || undefined,
      }));
    } catch (setupError) {
      const message =
        setupError instanceof Error ? setupError.message : "Setup could not start";
      if (/confirm your password/i.test(message)) {
        setNeedsUnlock(true);
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    setBusy(true);
    setError(null);
    try {
      await completeFirebaseTotpEnrollment(code);
      window.location.assign(reauthenticateHref);
    } catch (setupError) {
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Code could not be verified",
      );
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    try {
      await disableFirebaseTotp();
      setStatus({ totpEnabled: false, recovery: "administrator-assisted" });
    } catch (disableError) {
      const message =
        disableError instanceof Error
          ? disableError.message
          : "Authenticator could not be removed";
      if (/confirm your password/i.test(message)) {
        setNeedsUnlock(true);
      }
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm dark:border-white/10">
      <CardHeader className="border-b border-border/40 bg-slate-100/20 dark:border-white/5 dark:bg-black/10">
        <CardTitle className="flex items-center gap-2.5 text-xl font-bold">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
          Two-factor authentication
        </CardTitle>
        <CardDescription>
          Protect sign-in with an authenticator app. If you lose the enrolled
          device, ask an administrator for account recovery.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-6 sm:p-8">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        {needsUnlock ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirm your account password to set up or change your
              authenticator. This stays on this page — you do not need to leave
              Profile.
            </p>
            <div className="max-w-sm space-y-2">
              <Label htmlFor="security-unlock-email">Email</Label>
              <Input
                id="security-unlock-email"
                type="email"
                autoComplete="username"
                value={accountEmail}
                readOnly
              />
            </div>
            <div className="max-w-sm space-y-2">
              <Label htmlFor="security-unlock-password">Password</Label>
              <Input
                id="security-unlock-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && password && !busy) {
                    void unlock();
                  }
                }}
              />
            </div>
            {needsTotpForUnlock ? (
              <div className="max-w-sm space-y-2">
                <Label htmlFor="security-unlock-totp">Authenticator code</Label>
                <Input
                  id="security-unlock-totp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={unlockTotpCode}
                  onChange={(event) => setUnlockTotpCode(event.target.value)}
                />
              </div>
            ) : null}
            <Button
              type="button"
              disabled={
                busy ||
                !accountEmail ||
                !password ||
                (needsTotpForUnlock && unlockTotpCode.trim().length !== 6)
              }
              onClick={() => void unlock()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Confirm and continue
            </Button>
          </div>
        ) : status?.totpEnabled ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm">
              Authenticator protection is enabled.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => window.location.assign(continueHref)}
              >
                Continue
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => void disable()}
              >
                <ShieldOff className="h-4 w-4" aria-hidden="true" />
                Remove authenticator
              </Button>
            </div>
          </div>
        ) : enrollment ? (
          <div className="space-y-5">
            <p className="text-sm text-muted-foreground">
              Add this key or setup link to your authenticator app, then enter
              its current six-digit code.
            </p>
            <div className="space-y-2">
              <Label>Manual setup key</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={enrollment.secretKey}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Copy setup key"
                  onClick={() =>
                    void navigator.clipboard.writeText(enrollment.secretKey)
                  }
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <a
                className="text-sm text-primary underline"
                href={enrollment.authenticatorUri}
              >
                Open in an authenticator app
              </a>
            </div>
            <div className="max-w-sm space-y-2">
              <Label htmlFor="firebase-totp-confirm-code">
                Six-digit verification code
              </Label>
              <Input
                id="firebase-totp-confirm-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <Button
              type="button"
              disabled={busy || code.trim().length !== 6}
              onClick={() => void complete()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              Confirm authenticator
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            disabled={busy || status === null}
            onClick={() => void begin()}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            )}
            Set up authenticator
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
