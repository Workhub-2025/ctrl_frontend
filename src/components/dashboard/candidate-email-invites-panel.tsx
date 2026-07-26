"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Plus, RefreshCw, X, Printer, FileText } from "lucide-react";
import { HiringManagerPortalClientService } from "@/services/hiring-manager-portal-client.service";
import { fetchSessionAccessMaterial } from "@/lib/copy-share-links";
import { cn } from "@/lib/utils";
import {
  portalBadgeClass,
  portalPanelClass,
  portalTableHeaderClass,
  portalTableRowClass,
  portalTableShellClass,
} from "@/components/dashboard/portal/portal-design-tokens";

type PendingInvite = {
  id: string;
  email: string;
  inviteStatus: "invited" | "registered" | "started";
  candidateCode?: string;
  accessToken?: string;
};

type CandidateEmailInvitesPanelProps = {
  sessionId: string;
  deliveryMode: "In-person" | "Remote";
  candidateCount: number;
  candidateLimit: number;
  pendingInvites?: PendingInvite[];
  disabled?: boolean;
  disabledReason?: string;
  onInvitesSent?: () => void | Promise<void>;
  className?: string;
};

type OfflineSheetMaterial = {
  accessCode: string;
  joinUrl: string;
  copyCount: number;
};

const RESEND_BUTTON_LOCK_MS = 15 * 1000;
const MAX_OFFLINE_COPIES = 100;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function printOfflineSheets(material: OfflineSheetMaterial) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const accessCode = escapeHtml(material.accessCode);
  const joinUrl = escapeHtml(material.joinUrl);
  const cardsHtml = Array.from({ length: material.copyCount }, (_, index) => `
      <div class="card">
        <div class="logo">CTRL ASSESSMENT PLATFORM</div>
        <div class="title">Candidate Access Slip</div>
        <div class="slip-number">Slip ${index + 1} of ${material.copyCount}</div>
        <div class="field">
          <span class="label">Session code:</span>
          <span class="value">${accessCode}</span>
        </div>
        <div class="field">
          <span class="label">Join page:</span>
          <span class="value url">${joinUrl}</span>
        </div>
        <div class="instructions">
          1. Open <strong>/join</strong> (or the join link above).<br>
          2. Enter the session code to create your account and start.
        </div>
      </div>
    `).join("");

  printWindow.document.write(`
      <html>
        <head>
          <title>CTRL - Print Access Slips</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: #fff;
              color: #000;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
            }
            .card {
              border: 2px dashed #ccc;
              border-radius: 8px;
              padding: 20px;
              box-sizing: border-box;
              page-break-inside: avoid;
            }
            .logo {
              font-size: 10px;
              font-weight: bold;
              letter-spacing: 1px;
              color: #555;
              margin-bottom: 5px;
            }
            .title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 8px;
              border-bottom: 1px solid #eee;
              padding-bottom: 5px;
            }
            .slip-number {
              font-size: 11px;
              color: #777;
              margin-bottom: 12px;
            }
            .field {
              margin-bottom: 10px;
              font-size: 14px;
            }
            .label {
              font-weight: bold;
              color: #333;
              margin-right: 5px;
            }
            .value {
              font-family: monospace;
              background: #f5f5f5;
              padding: 2px 6px;
              border-radius: 4px;
              font-size: 15px;
              word-break: break-all;
            }
            .value.url {
              font-size: 12px;
            }
            .instructions {
              font-size: 11px;
              color: #666;
              margin-top: 15px;
              line-height: 1.4;
            }
            @media print {
              body { padding: 0; }
              .card { border-color: #000; }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${cardsHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
  printWindow.document.close();
}

export function CandidateEmailInvitesPanel({
  sessionId,
  deliveryMode,
  candidateCount,
  candidateLimit,
  pendingInvites = [],
  disabled = false,
  disabledReason,
  onInvitesSent,
  className,
}: CandidateEmailInvitesPanelProps) {
  const supportsOfflineSheets = deliveryMode === "In-person";
  const [inviteEmailInput, setInviteEmailInput] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [lockedResendInviteIds, setLockedResendInviteIds] = useState<Record<string, true>>({});
  const resendUnlockTimeoutsRef = useRef<Record<string, number>>({});

  const [activeTab, setActiveTab] = useState<"email" | "offline">("email");
  const [offlineCount, setOfflineCount] = useState<number>(1);
  const [isPreparingOffline, setIsPreparingOffline] = useState(false);
  const [offlineMaterial, setOfflineMaterial] = useState<OfflineSheetMaterial | null>(null);

  const remainingSeats = Math.max(0, candidateLimit - candidateCount);
  const maxBatchSize = Math.max(0, Math.min(25, remainingSeats));
  const maxOfflineCopies = Math.max(
    1,
    Math.min(MAX_OFFLINE_COPIES, remainingSeats || MAX_OFFLINE_COPIES)
  );
  const trimmedInviteInput = inviteEmailInput.trim();
  const canQueueMore = !disabled && remainingSeats > 0 && inviteEmails.length < maxBatchSize;
  const canAddFromInput = canQueueMore && trimmedInviteInput.length > 0;

  useEffect(() => {
    if (!supportsOfflineSheets && activeTab === "offline") {
      setActiveTab("email");
    }
  }, [supportsOfflineSheets, activeTab]);

  useEffect(() => {
    setOfflineCount((current) => Math.min(Math.max(1, current), maxOfflineCopies));
  }, [maxOfflineCopies]);

  useEffect(() => {
    const timeouts = resendUnlockTimeoutsRef.current;
    return () => {
      Object.values(timeouts).forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const parseInviteEmails = (raw: string) =>
    raw
      .split(/[\s,;]+/)
      .map((value) => value.trim().toLowerCase())
      .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

  const addInviteEmails = (raw: string) => {
    if (!canQueueMore) {
      setInviteError(
        disabled
          ? disabledReason || "Invites are disabled for this session."
          : remainingSeats === 0
            ? "Session is full — no seats left to invite."
            : "Invite batch limit reached."
      );
      return;
    }

    const parsed = parseInviteEmails(raw);
    if (parsed.length === 0) {
      setInviteError("Enter a valid email address (for example name@company.com).");
      return;
    }

    setInviteError(null);
    setInviteFeedback(null);
    setInviteEmails((current) => {
      const seen = new Set(current);
      const next = [...current];
      for (const email of parsed) {
        if (seen.has(email) || next.length >= maxBatchSize) continue;
        seen.add(email);
        next.push(email);
      }
      return next;
    });
    setInviteEmailInput("");
  };

  const removeQueuedInvite = (email: string) => {
    setInviteEmails((current) => current.filter((value) => value !== email));
    setInviteError(null);
  };

  const sendCandidateInvites = async () => {
    if (inviteEmails.length === 0 || disabled) return;

    setIsSendingInvites(true);
    setInviteFeedback(null);
    setInviteError(null);

    try {
      const result = await HiringManagerPortalClientService.inviteCandidatesToSession(
        sessionId,
        inviteEmails
      );
      const sentCount = result.sent.length;
      const failedCount = result.failed.length;
      const verb = result.queued ? "Queued" : "Processed";
      const deliveryNote = result.queued
        ? " Email delivery is asynchronous — check the candidate inbox (and spam) shortly."
        : "";
      if (sentCount === 0) {
        setInviteError(
          failedCount > 0
            ? result.failed.join(" · ")
            : "Candidate invites could not be queued."
        );
        return;
      }
      setInviteFeedback(
        failedCount > 0
          ? `${verb} ${sentCount} invite${sentCount === 1 ? "" : "s"}. ${failedCount} failed: ${result.failed.join(" · ")}.${deliveryNote}`
          : `${verb} ${sentCount} invite${sentCount === 1 ? "" : "s"}.${deliveryNote}`
      );
      setInviteEmails([]);
      await onInvitesSent?.();
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : "Candidate invites could not be sent."
      );
    } finally {
      setIsSendingInvites(false);
    }
  };

  const resendCandidateInvite = async (invite: PendingInvite) => {
    if (disabled || resendingInviteId) return;
    if (lockedResendInviteIds[invite.id]) return;

    setResendingInviteId(invite.id);
    setInviteFeedback(null);
    setInviteError(null);

    try {
      await HiringManagerPortalClientService.resendCandidateInvite(invite.id);
      setLockedResendInviteIds((current) => ({ ...current, [invite.id]: true }));
      window.clearTimeout(resendUnlockTimeoutsRef.current[invite.id]);
      resendUnlockTimeoutsRef.current[invite.id] = window.setTimeout(() => {
        setLockedResendInviteIds((current) => {
          const next = { ...current };
          delete next[invite.id];
          return next;
        });
        delete resendUnlockTimeoutsRef.current[invite.id];
      }, RESEND_BUTTON_LOCK_MS);
      setInviteFeedback(
        `Invite re-queued for ${invite.email}. Delivery is asynchronous while SMTP is operator-gated.`
      );
      await onInvitesSent?.();
    } catch (error) {
      setInviteError(
        error instanceof Error ? error.message : "Candidate invite could not be resent."
      );
    } finally {
      setResendingInviteId(null);
    }
  };

  const prepareOfflineSheets = async () => {
    if (!supportsOfflineSheets || offlineCount < 1 || disabled) return;
    setIsPreparingOffline(true);
    setInviteFeedback(null);
    setInviteError(null);

    try {
      const material = await fetchSessionAccessMaterial(sessionId);
      const prepared: OfflineSheetMaterial = {
        accessCode: material.accessCode,
        joinUrl: material.joinUrl,
        copyCount: offlineCount,
      };
      setOfflineMaterial(prepared);
      setInviteFeedback(
        `Prepared ${offlineCount} printable slip${offlineCount === 1 ? "" : "s"} with this session's access code.`
      );
    } catch (error) {
      setOfflineMaterial(null);
      setInviteError(
        error instanceof Error ? error.message : "Offline slips could not be prepared."
      );
    } finally {
      setIsPreparingOffline(false);
    }
  };

  return (
    <div className={cn(portalPanelClass, "space-y-4 rounded-2xl p-4", className)}>
      {supportsOfflineSheets ? (
        <div className="flex border-b border-white/5 pb-1 gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("email");
              setInviteFeedback(null);
              setInviteError(null);
            }}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-semibold transition-colors duration-200",
              activeTab === "email"
                ? "border-primary text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Mail className="h-3.5 w-3.5" />
            Email Invites
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("offline");
              setInviteFeedback(null);
              setInviteError(null);
            }}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-1.5 text-xs font-semibold transition-colors duration-200",
              activeTab === "offline"
                ? "border-primary text-foreground font-bold"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Offline Code Sheets
          </button>
        </div>
      ) : null}

      {activeTab === "email" || !supportsOfflineSheets ? (
        <>
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              Candidate email invites
            </h3>
            <p className="text-xs text-muted-foreground">
              Invite candidates directly to this session ({deliveryMode.toLowerCase()} delivery).
              {remainingSeats > 0
                ? ` ${remainingSeats} seat${remainingSeats === 1 ? "" : "s"} remaining.`
                : " Session is full."}
              {deliveryMode === "Remote"
                ? " Share the session access code above for candidates without an invite email."
                : null}
            </p>
            {disabledReason ? (
              <p className="text-xs text-muted-foreground">{disabledReason}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/*
              Input's base styles include w-full. Inside a row flex that overflows
              and covers Add (disabled:pointer-events-none is unrelated — the
              hit target was simply under the input). Constrain with flex-1/min-w-0.
            */}
            <div className="min-w-0 flex-1">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="candidate@email.com"
                value={inviteEmailInput}
                onChange={(event) => {
                  setInviteEmailInput(event.target.value);
                  if (inviteError) setInviteError(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    addInviteEmails(inviteEmailInput);
                  }
                }}
                disabled={disabled || remainingSeats === 0}
                aria-invalid={Boolean(inviteError)}
                className="rounded-lg border-white/10 bg-white/[0.02] text-white"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="relative z-10 w-full shrink-0 rounded-lg border-white/10 sm:w-auto"
              onClick={() => addInviteEmails(inviteEmailInput)}
              disabled={!canAddFromInput}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add
            </Button>
          </div>

          {inviteEmails.length > 0 ? (
            <ul className="flex flex-wrap gap-2" aria-label="Queued invite emails">
              {inviteEmails.map((email) => (
                <li key={email}>
                  <Badge
                    variant="secondary"
                    className="gap-1.5 rounded-lg border-border bg-muted/30 py-1 pl-2.5 pr-1 text-xs text-foreground"
                  >
                    <span className="max-w-[14rem] truncate">{email}</span>
                    <button
                      type="button"
                      onClick={() => removeQueuedInvite(email)}
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground"
                      aria-label={`Remove ${email} from invite queue`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      Remove
                    </button>
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs italic text-muted-foreground">
              Paste multiple emails separated by commas or new lines, then Add.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              className="rounded-lg"
              onClick={() => void sendCandidateInvites()}
              disabled={disabled || inviteEmails.length === 0 || isSendingInvites || remainingSeats === 0}
            >
              {isSendingInvites ? (
                <RefreshCw className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              ) : (
                <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              {isSendingInvites ? "Sending invites…" : "Send invites"}
            </Button>
            {inviteFeedback && activeTab === "email" ? (
              <p className="text-xs text-emerald-400">{inviteFeedback}</p>
            ) : null}
            {inviteError && activeTab === "email" ? (
              <p className="text-xs text-red-400">{inviteError}</p>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4 text-primary" />
              Offline Access Slips
            </h3>
            <p className="text-xs text-muted-foreground">
              Print handout slips with this session's shared access code and /join link.
              Every slip uses the same code — candidates enter it on /join (ideal for
              in-person rooms without email invites).
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Copies to print
              </label>
              <Input
                type="number"
                min={1}
                max={maxOfflineCopies}
                value={offlineCount}
                onChange={(e) =>
                  setOfflineCount(
                    Math.min(maxOfflineCopies, Math.max(1, Number(e.target.value) || 1))
                  )
                }
                disabled={disabled || isPreparingOffline}
                className="rounded-lg border-white/10 bg-white/[0.02] text-white"
              />
            </div>
            <Button
              type="button"
              className="rounded-lg"
              onClick={() => void prepareOfflineSheets()}
              disabled={disabled || isPreparingOffline || offlineCount < 1}
            >
              {isPreparingOffline ? (
                <RefreshCw className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="mr-1.5 h-4 w-4" />
              )}
              {isPreparingOffline ? "Preparing…" : "Prepare slips"}
            </Button>
          </div>

          {inviteFeedback ? <p className="text-xs text-emerald-400">{inviteFeedback}</p> : null}
          {inviteError ? <p className="text-xs text-red-400">{inviteError}</p> : null}

          {offlineMaterial ? (
            <div className="space-y-4 rounded-xl border border-border bg-muted/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-foreground">
                    {offlineMaterial.copyCount} slip
                    {offlineMaterial.copyCount === 1 ? "" : "s"} ready
                  </h4>
                  <p className="mt-1 font-mono text-sm font-semibold tracking-wider text-foreground">
                    {/* Intentional HM reveal after authenticated join-link fetch */}
                    {offlineMaterial.accessCode}
                  </p>
                  <p className="mt-1 break-all text-[11px] text-muted-foreground">
                    {offlineMaterial.joinUrl}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => printOfflineSheets(offlineMaterial)}
                  className="shrink-0 rounded-lg gap-1.5 bg-primary/20 text-primary-foreground border border-primary/20 hover:bg-primary/30"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print slips
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                All copies share one session code. Capacity is enforced when candidates
                claim the code on /join — printing N slips does not reserve N seats.
              </p>
            </div>
          ) : null}
        </>
      )}

      {pendingInvites.length > 0 ? (
        <div className={portalTableShellClass}>
          <table className="w-full border-collapse text-left text-xs text-foreground">
            <thead className={portalTableHeaderClass}>
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <th className="p-3">Email</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingInvites.map((invite) => {
                const isResending = resendingInviteId === invite.id;
                const isLocked = Boolean(lockedResendInviteIds[invite.id]);

                return (
                  <tr key={invite.id} className={portalTableRowClass}>
                    <td className="p-3">{invite.email || "—"}</td>
                    <td className="p-3 capitalize">{invite.inviteStatus}</td>
                    <td className="p-3 text-right">
                      {invite.email ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 min-w-[8rem] rounded-lg border-border bg-muted/20 px-2.5 text-xs text-foreground hover:bg-muted/50 hover:text-foreground"
                          onClick={() => void resendCandidateInvite(invite)}
                          disabled={
                            disabled
                            || Boolean(resendingInviteId)
                            || isLocked
                          }
                        >
                          <RefreshCw
                            className={cn(
                              "h-3.5 w-3.5",
                              isResending ? "motion-safe:animate-spin" : ""
                            )}
                            aria-hidden="true"
                          />
                          {isResending ? "Resending" : "Resend"}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
