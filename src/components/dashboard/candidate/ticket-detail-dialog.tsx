"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Tag, TicketCheck } from "lucide-react";
import type { SupportTicket } from "@/services/support-ticket.service";
import { cn } from "@/lib/utils";

type StatusKey = "open" | "in_progress" | "resolved" | "closed";

const STATUS_TONES: Record<StatusKey, { label: string; className: string }> = {
  open: {
    label: "Open",
    className:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  in_progress: {
    label: "In progress",
    className:
      "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300",
  },
  resolved: {
    label: "Resolved",
    className:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
  closed: {
    label: "Closed",
    className:
      "border-border bg-muted/60 text-muted-foreground dark:border-white/10",
  },
};

function normaliseStatus(status: string): StatusKey {
  const key = status?.toLowerCase().replace(/[\s-]+/g, "_");
  if (
    key === "open" ||
    key === "in_progress" ||
    key === "resolved" ||
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

type TicketDetailDialogProps = {
  ticket: SupportTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TicketDetailDialog({
  ticket,
  open,
  onOpenChange,
}: TicketDetailDialogProps) {
  if (!ticket) return null;

  const status = normaliseStatus(ticket.status);
  const tone = STATUS_TONES[status];
  const isResolved = status === "resolved" || status === "closed";
  const isContact = ticket.category === "contact";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-[540px]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          aria-hidden="true"
        />
        <DialogHeader className="pr-10">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <TicketCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 space-y-1">
              <DialogTitle className="font-display text-lg font-bold tracking-tight">
                {ticket.subject}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-primary">
                  {ticket.ticketNumber}
                </span>
                <Badge
                  variant="outline"
                  className={cn("rounded-full text-[11px] font-semibold", tone.className)}
                >
                  {tone.label}
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

        <div className="space-y-4 pt-1">
          <div className="flex flex-wrap gap-2 text-xs">
            {ticket.category ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/55 bg-muted/40 px-2.5 py-1 font-medium text-muted-foreground">
                <Tag className="h-3 w-3" aria-hidden="true" />
                {prettify(ticket.category)}
              </span>
            ) : null}
            {ticket.priority ? (
              <span className="inline-flex items-center rounded-lg border border-border/55 bg-muted/40 px-2.5 py-1 font-medium text-muted-foreground">
                {prettify(ticket.priority)} priority
              </span>
            ) : null}
            {ticket.createdAt ? (
              <span className="inline-flex items-center rounded-lg border border-border/55 bg-muted/40 px-2.5 py-1 font-medium text-muted-foreground">
                Raised {formatDateTime(ticket.createdAt)}
              </span>
            ) : null}
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/15 p-4 dark:border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Your message
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {ticket.description}
            </p>
          </div>

          {isResolved && ticket.resolution ? (
            <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                aria-hidden="true"
              />
              <div className="min-w-0 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-300">
                  Resolution
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {ticket.resolution}
                </p>
                {ticket.resolvedAt ? (
                  <p className="text-xs text-muted-foreground">
                    Resolved {formatDateTime(ticket.resolvedAt)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
