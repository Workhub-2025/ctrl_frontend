"use client";

import { useEffect, useState } from "react";
import { Copy, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  beginFirebaseTotpEnrollment,
  completeFirebaseTotpEnrollment,
  disableFirebaseTotp,
  getFirebaseTotpStatus,
  type FirebaseTotpEnrollment,
  type FirebaseTotpStatus,
} from "@/lib/firebase-totp-browser";

export function FirebaseTotpSecurityPanel({
  continueHref,
  reauthenticateHref = "/auth/login?message=Sign+in+again+and+enter+your+authenticator+code+to+finish+setup.",
}: {
  continueHref: string;
  reauthenticateHref?: string;
}) {
  const [status, setStatus] = useState<FirebaseTotpStatus | null>(null);
  const [enrollment, setEnrollment] = useState<FirebaseTotpEnrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setStatus(getFirebaseTotpStatus());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Security settings unavailable");
    }
  }, []);

  const begin = async () => {
    setBusy(true);
    setError(null);
    try {
      setEnrollment(await beginFirebaseTotpEnrollment());
    } catch (setupError) {
      setError(setupError instanceof Error ? setupError.message : "Setup could not start");
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
      setError(setupError instanceof Error ? setupError.message : "Code could not be verified");
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
      setError(disableError instanceof Error ? disableError.message : "Authenticator could not be removed");
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
          Firebase protects sign-in with an authenticator app. Losing the
          enrolled device requires administrator-assisted account recovery.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-6 sm:p-8">
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {status?.totpEnabled ? (
          <div className="space-y-4">
            <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm">
              Authenticator protection is enabled.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => window.location.assign(continueHref)}>Continue</Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void disable()}>
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
                <Input readOnly value={enrollment.secretKey} className="font-mono" />
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
              <a className="text-sm text-primary underline" href={enrollment.authenticatorUri}>
                Open in an authenticator app
              </a>
            </div>
            <div className="max-w-sm space-y-2">
              <Label htmlFor="firebase-totp-confirm-code">Six-digit verification code</Label>
              <Input
                id="firebase-totp-confirm-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </div>
            <Button type="button" disabled={busy || code.trim().length !== 6} onClick={() => void complete()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Confirm authenticator
            </Button>
          </div>
        ) : (
          <Button type="button" disabled={busy || status === null} onClick={() => void begin()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            Set up authenticator
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

