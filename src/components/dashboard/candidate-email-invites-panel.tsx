"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Plus, RefreshCw, X } from "lucide-react";
import { HiringManagerPortalClientService } from "@/services/hiring-manager-portal-client.service";
import { cn } from "@/lib/utils";
import { portalPanelClass } from "@/components/dashboard/portal/portal-design-tokens";

type PendingInvite = {
  id: string;
  email: string;
  inviteStatus: "invited" | "registered" | "started";
  candidateCode?: string;
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
  const [inviteEmailInput, setInviteEmailInput] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const remainingSeats = Math.max(0, candidateLimit - candidateCount);
  const maxBatchSize = Math.min(25, remainingSeats);

  const addInviteEmails = (raw: string) => {
    const parsed = raw
      .split(/[\s,;]+/)
      .map((value) => value.trim().toLowerCase())
      .filter((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));

    if (parsed.length === 0) return;

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
      setInviteFeedback(
        failedCount > 0
          ? `Sent ${sentCount} invite${sentCount === 1 ? "" : "s"}. ${failedCount} failed.`
          : `Sent ${sentCount} invite${sentCount === 1 ? "" : "s"}.`
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

  return (
    <div className={cn(portalPanelClass, "space-y-4 rounded-2xl p-4", className)}>
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white">
          <Mail className="h-4 w-4 text-primary" />
          Candidate email invites
        </h3>
        <p className="text-xs text-slate-400">
          Invite candidates directly to this session ({deliveryMode.toLowerCase()} delivery).
          {remainingSeats > 0
            ? ` ${remainingSeats} seat${remainingSeats === 1 ? "" : "s"} remaining.`
            : " Session is full."}
        </p>
        {disabledReason ? (
          <p className="text-xs text-amber-400">{disabledReason}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          placeholder="candidate@email.com"
          value={inviteEmailInput}
          onChange={(event) => setInviteEmailInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addInviteEmails(inviteEmailInput);
            }
          }}
          disabled={disabled || remainingSeats === 0}
          className="rounded-lg border-white/10 bg-white/[0.02] text-white"
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0 rounded-lg border-white/10"
          onClick={() => addInviteEmails(inviteEmailInput)}
          disabled={disabled || !inviteEmailInput.trim() || inviteEmails.length >= maxBatchSize || remainingSeats === 0}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add
        </Button>
      </div>

      {inviteEmails.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {inviteEmails.map((email) => (
            <Badge
              key={email}
              variant="secondary"
              className="gap-1 rounded-lg border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-slate-200"
            >
              {email}
              <button
                type="button"
                onClick={() =>
                  setInviteEmails((current) => current.filter((value) => value !== email))
                }
                className="rounded-full p-0.5 hover:bg-white/10"
                aria-label={`Remove ${email}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs italic text-slate-500">
          Paste multiple emails separated by commas or new lines.
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
        {inviteFeedback ? <p className="text-xs text-emerald-400">{inviteFeedback}</p> : null}
        {inviteError ? <p className="text-xs text-red-400">{inviteError}</p> : null}
      </div>

      {pendingInvites.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#080c16]/30">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <th className="p-3">Email</th>
                <th className="p-3">Status</th>
                <th className="p-3">Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {pendingInvites.map((invite) => (
                <tr key={invite.id}>
                  <td className="p-3">{invite.email}</td>
                  <td className="p-3 capitalize">{invite.inviteStatus}</td>
                  <td className="p-3 font-mono text-[11px] text-slate-400">
                    {invite.candidateCode ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
