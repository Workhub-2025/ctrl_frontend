"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2, Send, Tag, TicketCheck } from "lucide-react";
import {
  SupportTicketService,
  type SupportTicket,
  type SupportTicketMessage,
} from "@/services/support-ticket.service";
import { cn } from "@/lib/utils";
import {
  portalAlertInfoClass,
  portalBadgeClass,
} from "@/components/dashboard/portal/portal-design-tokens";

type StatusKey =
  | "open"
  | "in_progress"
  | "resolved"
  | "awaiting_user"
  | "closed";

const STATUS_LABELS: Record<StatusKey, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  awaiting_user: "Awaiting your confirmation",
  closed: "Closed",
};

function normaliseStatus(status: string): StatusKey {
  const key = status?.toLowerCase().replace(/[\s-]+/g, "_");
  if (
    key === "open" ||
    key === "in_progress" ||
    key === "resolved" ||
    key === "awaiting_user" ||
    key === "closed"
  ) {
    return key;
  }
  return "open";
}

function prettify(value: string): string {
  if (!value) return "";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function authorLabel(message: SupportTicketMessage): string {
  const author = message.author;
  if (!author) return "Support";
  const name = [author.firstName, author.lastName].filter(Boolean).join(" ");
  const roleType = author.role?.type || author.role?.name?.toLowerCase() || "";
  if (roleType.includes("admin")) return name || "CTRL Support";
  return name || author.email || "You";
}

type TicketDetailDialogProps = {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTicketUpdated?: () => void;
};

export function TicketDetailDialog({
  ticket,
  open,
  onOpenChange,
  onTicketUpdated,
}: TicketDetailDialogProps) {
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [reply, setReply] = useState("");
  const [reopenNote, setReopenNote] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [localTicket, setLocalTicket] = useState<SupportTicket | null>(ticket);

  useEffect(() => {
    setLocalTicket(ticket);
  }, [ticket]);

  const ticketId = localTicket?.documentId || localTicket?.id;

  const loadMessages = useCallback(async () => {
    if (!ticketId) return;
    setLoadingMessages(true);
    setError("");
    try {
      const data = await SupportTicketService.getTicketMessages(ticketId);
      setMessages(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load messages"
      );
    } finally {
      setLoadingMessages(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (open && ticketId) {
      void loadMessages();
      setReply("");
      setReopenNote("");
      setError("");
    }
  }, [open, ticketId, loadMessages]);

  if (!localTicket) return null;

  const status = normaliseStatus(localTicket.status);
  const isContact = localTicket.category === "contact";
  const canReply =
    status === "open" || status === "in_progress";
  const isAwaitingConfirmation = status === "awaiting_user";
  const isClosed = status === "closed";

  const handleSendReply = async () => {
    if (!ticketId || !reply.trim()) return;
    setSending(true);
    setError("");
    try {
      await SupportTicketService.addTicketMessage(ticketId, {
        body: reply.trim(),
      });
      setReply("");
      await loadMessages();
      onTicketUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reply");
    } finally {
      setSending(false);
    }
  };

  const handleConfirm = async () => {
    if (!ticketId) return;
    setConfirming(true);
    setError("");
    try {
      const updated = await SupportTicketService.confirmTicketResolution(
        ticketId,
        "confirm"
      );
      setLocalTicket(updated);
      await loadMessages();
      onTicketUpdated?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not confirm resolution"
      );
    } finally {
      setConfirming(false);
    }
  };

  const handleReopen = async () => {
    if (!ticketId) return;
    setConfirming(true);
    setError("");
    try {
      const updated = await SupportTicketService.confirmTicketResolution(
        ticketId,
        "reopen",
        reopenNote.trim() || undefined
      );
      setLocalTicket(updated);
      setReopenNote("");
      await loadMessages();
      onTicketUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reopen ticket");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-[540px] max-h-[85vh] flex flex-col">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          aria-hidden="true"
        />
        <DialogHeader className="pr-10 shrink-0">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <TicketCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="font-display text-lg font-bold tracking-tight">
                {localTicket.subject}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">
                  {localTicket.ticketNumber}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full text-[11px] font-semibold",
                    portalBadgeClass
                  )}
                >
                  {STATUS_LABELS[status]}
                </Badge>
                {isContact ? (
                  <Badge variant="outline" className="rounded-full text-[11px]">
                    Hiring team message
                  </Badge>
                ) : null}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1 overflow-y-auto flex-1 min-h-0">
          <div className="flex flex-wrap gap-2 text-xs">
            {localTicket.category ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/55 bg-muted/40 px-2.5 py-1 font-medium text-muted-foreground">
                <Tag className="h-3 w-3" aria-hidden="true" />
                {prettify(localTicket.category)}
              </span>
            ) : null}
            {localTicket.priority ? (
              <span className="inline-flex items-center rounded-lg border border-border/55 bg-muted/40 px-2.5 py-1 font-medium text-muted-foreground">
                {prettify(localTicket.priority)} priority
              </span>
            ) : null}
            {localTicket.createdAt ? (
              <span className="inline-flex items-center rounded-lg border border-border/55 bg-muted/40 px-2.5 py-1 font-medium text-muted-foreground">
                Raised {formatDateTime(localTicket.createdAt)}
              </span>
            ) : null}
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/15 p-4 dark:border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Original message
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {localTicket.description}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Conversation
            </p>
            {loadingMessages ? (
              <p className="text-sm text-muted-foreground">Loading messages…</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No replies yet. Support will respond here.
              </p>
            ) : (
              <ul className="space-y-2">
                {messages.map((message) => (
                  <li
                    key={message.documentId || message.id}
                    className="rounded-xl border border-border/60 bg-muted/10 p-3 dark:border-white/5"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {authorLabel(message)}
                      </span>
                      <time dateTime={message.createdAt}>
                        {formatDateTime(message.createdAt)}
                      </time>
                    </div>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
                      {message.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {isAwaitingConfirmation ? (
            <div className={cn(portalAlertInfoClass, "space-y-3 p-4")}>
              <div className="flex items-start gap-2">
                <CheckCircle2
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Is this issue fixed?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Support marked this ticket as resolved. Confirm if everything
                    looks good, or let us know if you still need help.
                  </p>
                </div>
              </div>
              <Textarea
                value={reopenNote}
                onChange={(e) => setReopenNote(e.target.value)}
                placeholder="Optional: describe what is still wrong…"
                rows={2}
                className="resize-none text-sm"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleConfirm}
                  disabled={confirming}
                  className="gap-1.5"
                >
                  {confirming ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Confirm fixed
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReopen}
                  disabled={confirming}
                >
                  Still an issue
                </Button>
              </div>
            </div>
          ) : null}

          {canReply && !isClosed ? (
            <div className="space-y-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply…"
                rows={3}
                className="resize-none text-sm"
              />
              <Button
                size="sm"
                onClick={handleSendReply}
                disabled={sending || !reply.trim()}
                className="gap-1.5"
              >
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Send reply
              </Button>
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
