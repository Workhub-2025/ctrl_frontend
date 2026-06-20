"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import {
  AdminAlert,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/admin-portal-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type TotpStatus = {
  totpEnabled: boolean;
  hasPendingSetup?: boolean;
};

export function AdminTotpSecurityPanel() {
  const [status, setStatus] = useState<TotpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [manualEntryKey, setManualEntryKey] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/totp/status", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? "Security settings could not be loaded");
      }
      setStatus(body.data ?? { totpEnabled: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Security settings could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const beginSetup = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    setBackupCodes(null);
    try {
      const response = await fetch("/api/admin/totp/begin-setup", { method: "POST" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? "Authenticator setup could not be started");
      }
      setQrDataUrl(body.data?.qrDataUrl ?? null);
      setManualEntryKey(body.data?.manualEntryKey ?? null);
      setMessage("Scan the QR code with iOS Passwords or another authenticator app, then enter a code to confirm.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authenticator setup could not be started");
    } finally {
      setBusy(false);
    }
  };

  const completeSetup = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/totp/complete-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: confirmCode }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? "Authenticator could not be confirmed");
      }
      setStatus({ totpEnabled: true });
      setQrDataUrl(null);
      setManualEntryKey(null);
      setConfirmCode("");
      setBackupCodes(Array.isArray(body.data?.backupCodes) ? body.data.backupCodes : null);
      setMessage("Two-factor authentication is now enabled for your admin account.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authenticator could not be confirmed");
    } finally {
      setBusy(false);
    }
  };

  const disableTotp = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? "Two-factor authentication could not be disabled");
      }
      setStatus({ totpEnabled: false });
      setDisableCode("");
      setBackupCodes(null);
      setQrDataUrl(null);
      setManualEntryKey(null);
      setMessage("Two-factor authentication has been disabled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Two-factor authentication could not be disabled");
    } finally {
      setBusy(false);
    }
  };

  const copyBackupCodes = async () => {
    if (!backupCodes?.length) return;
    await navigator.clipboard.writeText(backupCodes.join("\n"));
    setMessage("Backup codes copied to clipboard.");
  };

  return (
    <div className="space-y-6 pb-6">
      <AdminPageHeader
        title="Security"
        description="Protect your admin portal sign-in with a time-based one-time password (TOTP). Only administrator accounts use this step — clients, hiring managers, and candidates are unaffected."
        notice={
          error ? (
            <AdminAlert>{error}</AdminAlert>
          ) : message ? (
            <AdminAlert tone="info">{message}</AdminAlert>
          ) : null
        }
      />

      <AdminPanel className="space-y-6">
        <AdminSectionHeader
          title="Two-factor authentication"
          description="Use iOS Passwords, Google Authenticator, 1Password, or any TOTP app."
        />

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading security settings…
          </p>
        ) : status?.totpEnabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              Two-factor authentication is enabled on this account.
            </div>

            <div className="space-y-2 max-w-sm">
              <Label htmlFor="disable-totp-code">Code to disable 2FA</Label>
              <Input
                id="disable-totp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Authenticator or backup code"
                value={disableCode}
                onChange={(event) => setDisableCode(event.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl gap-2"
              disabled={busy || !disableCode.trim()}
              onClick={() => void disableTotp()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
              Disable two-factor authentication
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {!qrDataUrl ? (
              <Button type="button" className="rounded-xl gap-2" disabled={busy} onClick={() => void beginSetup()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Set up authenticator
              </Button>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="rounded-xl border border-border/60 bg-white p-3 dark:border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="Authenticator QR code" className="h-auto w-full" />
                </div>
                <div className="space-y-4">
                  {manualEntryKey ? (
                    <p className="text-sm text-muted-foreground">
                      Manual key:{" "}
                      <code className="rounded bg-muted px-2 py-1 font-mono text-xs">{manualEntryKey}</code>
                    </p>
                  ) : null}
                  <div className="space-y-2 max-w-sm">
                    <Label htmlFor="confirm-totp-code">Enter code from your app</Label>
                    <Input
                      id="confirm-totp-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      value={confirmCode}
                      onChange={(event) => setConfirmCode(event.target.value)}
                      className="rounded-xl font-mono tracking-widest"
                    />
                  </div>
                  <Button
                    type="button"
                    className="rounded-xl"
                    disabled={busy || !confirmCode.trim()}
                    onClick={() => void completeSetup()}
                  >
                    {busy ? "Confirming…" : "Confirm and enable"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {backupCodes?.length ? (
          <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-semibold text-foreground">Save these backup codes</p>
            <p className="text-sm text-muted-foreground">
              Each code works once if you lose access to your authenticator. Store them somewhere safe.
            </p>
            <ul className={cn("grid gap-2 font-mono text-sm sm:grid-cols-2")}>
              {backupCodes.map((code) => (
                <li key={code} className="rounded-lg bg-background/80 px-3 py-2">
                  {code}
                </li>
              ))}
            </ul>
            <Button type="button" variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => void copyBackupCodes()}>
              <Copy className="h-4 w-4" />
              Copy codes
            </Button>
          </div>
        ) : null}
      </AdminPanel>
    </div>
  );
}
