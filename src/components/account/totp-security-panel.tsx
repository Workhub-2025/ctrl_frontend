"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TotpStatus = {
  totpEnabled: boolean;
  hasPendingSetup?: boolean;
};

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body.error === "string"
        ? body.error
        : body.error?.message;
    throw new Error(
      message ?? "Security settings request failed",
    );
  }
  return body.data ?? {};
}

/** Legacy Strapi TOTP UI retained only for unported sessions. */
export function TotpSecurityPanel({
  continueHref,
}: {
  continueHref: string;
}) {
  const [status, setStatus] = useState<TotpStatus | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualEntryKey, setManualEntryKey] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setStatus(
        await readResponse(
          await fetch("/api/account/totp/status", { cache: "no-store" }),
        ),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Security settings could not be loaded",
      );
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const beginSetup = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await readResponse(
        await fetch("/api/account/totp/begin-setup", { method: "POST" }),
      );
      setQrDataUrl(data.qrDataUrl ?? null);
      setManualEntryKey(data.manualEntryKey ?? null);
      setMessage("Scan the QR code, then enter the current six-digit code.");
    } catch (setupError) {
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Authenticator setup could not be started",
      );
    } finally {
      setBusy(false);
    }
  };

  const completeSetup = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const data = await readResponse(
        await fetch("/api/account/totp/complete-setup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: confirmCode }),
        }),
      );
      setStatus({ totpEnabled: true });
      setQrDataUrl(null);
      setManualEntryKey(null);
      setConfirmCode("");
      setBackupCodes(
        Array.isArray(data.backupCodes) ? data.backupCodes : null,
      );
      setMessage(
        "Two-factor authentication is enabled. Your session has been refreshed.",
      );
    } catch (setupError) {
      setError(
        setupError instanceof Error
          ? setupError.message
          : "Authenticator could not be confirmed",
      );
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await readResponse(
        await fetch("/api/account/totp/disable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: disableCode }),
        }),
      );
      setStatus({ totpEnabled: false });
      setDisableCode("");
      setBackupCodes(null);
      setMessage("Two-factor authentication has been disabled.");
    } catch (disableError) {
      setError(
        disableError instanceof Error
          ? disableError.message
          : "Two-factor authentication could not be disabled",
      );
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
          Protect portal sign-in with iOS Passwords, Google Authenticator,
          1Password or another TOTP app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-6 sm:p-8">
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
        {status?.totpEnabled ? (
          <Button
            type="button"
            onClick={() => window.location.assign(continueHref)}
          >
            Continue to dashboard
          </Button>
        ) : null}

        {busy && status === null ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading security settings…
          </p>
        ) : status?.totpEnabled ? (
          <div className="space-y-4">
            <p className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-600" aria-hidden="true" />
              Two-factor authentication is enabled.
            </p>
            <div className="max-w-sm space-y-2">
              <Label htmlFor="portal-disable-totp-code">
                Authenticator or backup code
              </Label>
              <Input
                id="portal-disable-totp-code"
                autoComplete="one-time-code"
                value={disableCode}
                onChange={(event) => setDisableCode(event.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !disableCode.trim()}
              onClick={() => void disable()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldOff className="h-4 w-4" aria-hidden="true" />}
              Disable two-factor authentication
            </Button>
          </div>
        ) : !qrDataUrl ? (
          <Button type="button" disabled={busy} onClick={() => void beginSetup()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
            Set up authenticator
          </Button>
        ) : (
          <div className="grid gap-6 sm:grid-cols-[200px_minmax(0,1fr)]">
            <div className="border border-border bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Authenticator setup QR code" className="h-auto w-full" />
            </div>
            <div className="space-y-4">
              {manualEntryKey ? (
                <p className="break-all text-sm text-muted-foreground">
                  Manual key: <code>{manualEntryKey}</code>
                </p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="portal-confirm-totp-code">
                  Six-digit verification code
                </Label>
                <Input
                  id="portal-confirm-totp-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={confirmCode}
                  onChange={(event) => setConfirmCode(event.target.value)}
                />
              </div>
              <Button
                type="button"
                disabled={busy || !confirmCode.trim()}
                onClick={() => void completeSetup()}
              >
                {busy ? "Confirming…" : "Confirm and enable"}
              </Button>
            </div>
          </div>
        )}

        {backupCodes?.length ? (
          <div className="space-y-3 border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="font-semibold">Save these one-use backup codes</p>
            <ul className="grid gap-2 font-mono text-sm sm:grid-cols-2">
              {backupCodes.map((code) => <li key={code}>{code}</li>)}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void navigator.clipboard.writeText(backupCodes.join("\n"))}
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy codes
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
