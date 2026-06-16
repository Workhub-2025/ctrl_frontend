"use client";

import * as React from "react";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Inbox,
  RefreshCw,
  Tag,
  TicketCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CandidateEyebrow,
  CandidatePanel,
  CandidateSectionHeader,
} from "@/components/dashboard/candidate/candidate-portal-ui";
import { TicketDetailDialog } from "@/components/dashboard/candidate/ticket-detail-dialog";
import {
  SupportTicketService,
  type SupportTicket,
} from "@/services/support-ticket.service";
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

function formatDate(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONES[normaliseStatus(status)];
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", tone.className)}
    >
      {tone.label}
    </Badge>
  );
}

function TicketRow({
  ticket,
  onSelect,
}: {
  ticket: SupportTicket;
  onSelect: () => void;
}) {
  const status = normaliseStatus(ticket.status);
  const isResolved = status === "resolved" || status === "closed";
  const isContact = ticket.category === "contact";
  const created = formatDate(ticket.createdAt);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="group w-full rounded-xl border border-border/55 bg-background/40 p-4 text-left transition-[border-color,background-color] hover:border-primary/30 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/5 dark:bg-white/[0.02]"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-primary">
                {ticket.ticketNumber || "CTRL-—"}
              </span>
              <StatusBadge status={ticket.status} />
              {isContact ? (
                <Badge variant="outline" className="rounded-full text-[10px]">
                  Hiring team
                </Badge>
              ) : null}
            </div>
            <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
              {ticket.subject}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {created ? (
              <span className="text-[11px] font-medium text-muted-foreground">
                {created}
              </span>
            ) : null}
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
          </div>
        </div>

        {ticket.description ? (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {ticket.description}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {ticket.category ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-border/55 bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Tag className="h-3 w-3" aria-hidden="true" />
              {prettify(ticket.category)}
            </span>
          ) : null}
          {isResolved && ticket.resolution ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              Resolved
            </span>
          ) : null}
        </div>
      </button>
    </li>
  );
}

export function CandidateTicketHistory({
  refreshKey,
}: {
  refreshKey?: number;
} = {}) {
  const [tickets, setTickets] = useState<SupportTicket[]>(
    () => SupportTicketService.getCachedMyTickets() ?? []
  );
  const [isLoading, setIsLoading] = useState(
    () => !SupportTicketService.hasFreshMyTicketsCache()
  );
  const [error, setError] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const loadTickets = useCallback(async (options?: { force?: boolean }) => {
    const cached = SupportTicketService.getCachedMyTickets();
    const isManualRefresh = !!options?.force;

    if (!isManualRefresh && cached) {
      setTickets(cached);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await SupportTicketService.getMyTickets({ force: options?.force });
      setTickets(data);
    } catch (err) {
      if (!cached) {
        setError(
          err instanceof Error
            ? err.message
            : "We couldn't load your tickets. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTickets(refreshKey ? { force: true } : undefined);
  }, [loadTickets, refreshKey]);

  const openCount = tickets.filter(
    (t) => normaliseStatus(t.status) === "open" || normaliseStatus(t.status) === "in_progress"
  ).length;

  return (
    <>
      <section className="space-y-4">
        <CandidateSectionHeader
          eyebrow="Your tickets"
          title="Message & ticket history"
          description={
            openCount > 0
              ? `${openCount} open item${openCount !== 1 ? "s" : ""} — tap any row for full details.`
              : "All your IT tickets and hiring team messages in one place."
          }
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void loadTickets({ force: true })}
              disabled={isLoading}
              className="h-9 gap-2 rounded-xl text-xs font-semibold"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "motion-safe:animate-spin")} />
              Refresh
            </Button>
          }
        />

        <CandidatePanel accent="primary">
          <div className="flex items-center gap-3 border-b border-border/40 p-5 dark:border-white/5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <TicketCheck className="h-[18px] w-[18px]" aria-hidden="true" />
            </div>
            <div>
              <CandidateEyebrow>History</CandidateEyebrow>
              <p className="text-sm font-medium text-muted-foreground">
                {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} total
              </p>
            </div>
          </div>

          <div className="p-5">
            {isLoading ? (
              <ul className="space-y-3" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <li key={i} className="rounded-xl border p-4">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-2 h-4 w-3/4" />
                  </li>
                ))}
              </ul>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-10 text-center">
                <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
                <p className="text-sm font-semibold">Couldn&apos;t load tickets</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={() => void loadTickets({ force: true })}>
                  Try again
                </Button>
              </div>
            ) : tickets.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border/60 px-4 py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-muted/40 text-muted-foreground">
                  <Inbox className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">No tickets yet</p>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    IT tickets and hiring team messages appear here with their status
                    and any resolution notes.
                  </p>
                </div>
              </div>
            ) : (
              <ul className="space-y-3">
                {tickets.map((ticket) => (
                  <TicketRow
                    key={ticket.id || ticket.ticketNumber}
                    ticket={ticket}
                    onSelect={() => {
                      setSelectedTicket(ticket);
                      setDetailOpen(true);
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </CandidatePanel>
      </section>

      <TicketDetailDialog
        ticket={selectedTicket}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}
