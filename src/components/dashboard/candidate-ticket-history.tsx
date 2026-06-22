"use client";

import type { ReactNode } from "react";
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
import { TicketDetailDialog } from "@/components/dashboard/candidate/ticket-detail-dialog";
import {
  PortalEyebrow,
  PortalPanel,
  PortalSectionHeader,
} from "@/components/dashboard/portal/portal-ui";
import {
  SupportTicketService,
  type SupportTicket,
} from "@/services/support-ticket.service";
import { cn } from "@/lib/utils";
import { portalBadgeClass, portalPanelClass } from "@/components/dashboard/portal/portal-design-tokens";

type StatusKey = "open" | "in_progress" | "resolved" | "awaiting_user" | "closed";

const STATUS_LABELS: Record<StatusKey, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  awaiting_user: "Awaiting confirmation",
  closed: "Closed",
};

export type TicketHistoryLabels = {
  sectionEyebrow: string;
  sectionTitle: string;
  sectionDescriptionOpen: (openCount: number) => string;
  sectionDescriptionEmpty: string;
  emptyTitle: string;
  emptyDescription: string;
  historyLabel: string;
  contactBadgeLabel: string;
};

const DEFAULT_LABELS: TicketHistoryLabels = {
  sectionEyebrow: "Your tickets",
  sectionTitle: "Message & ticket history",
  sectionDescriptionOpen: (count) =>
    `${count} open item${count !== 1 ? "s" : ""} — tap any row for full details.`,
  sectionDescriptionEmpty:
    "All your IT tickets and hiring team messages in one place.",
  emptyTitle: "No tickets yet",
  emptyDescription:
    "IT tickets and hiring team messages appear here with their status and any resolution notes.",
  historyLabel: "History",
  contactBadgeLabel: "Hiring team",
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
  const key = normaliseStatus(status);
  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", portalBadgeClass)}>
      {STATUS_LABELS[key]}
    </Badge>
  );
}

function TicketRow({
  ticket,
  onSelect,
  contactBadgeLabel,
  showContactBadge,
}: {
  ticket: SupportTicket;
  onSelect: () => void;
  contactBadgeLabel: string;
  showContactBadge: boolean;
}) {
  const status = normaliseStatus(ticket.status);
  const isResolved = status === "resolved" || status === "closed";
  const isContact = ticket.category === "contact";
  const lastUpdated = formatDate(ticket.updatedAt || ticket.createdAt);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn(portalPanelClass, "group w-full p-4 text-left transition-[border-color,background-color] hover:border-primary/30 hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary")}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-primary">
                {ticket.ticketNumber || "CTRL-—"}
              </span>
              <StatusBadge status={ticket.status} />
              {showContactBadge && isContact ? (
                <Badge variant="outline" className="rounded-full text-[10px]">
                  {contactBadgeLabel}
                </Badge>
              ) : null}
            </div>
            <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
              {ticket.subject}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5">
            {lastUpdated ? (
              <span className="text-[11px] font-medium text-muted-foreground">
                Updated {lastUpdated}
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
            <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", portalBadgeClass)}>
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
  labels: labelsProp,
  headerActions,
  showContactBadge = true,
}: {
  refreshKey?: number;
  labels?: Partial<TicketHistoryLabels>;
  headerActions?: ReactNode;
  showContactBadge?: boolean;
} = {}) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };

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

  const sectionDescription =
    openCount > 0
      ? labels.sectionDescriptionOpen(openCount)
      : labels.sectionDescriptionEmpty;

  return (
    <>
      <section className="space-y-4">
        <PortalSectionHeader
          eyebrow={labels.sectionEyebrow}
          title={labels.sectionTitle}
          description={sectionDescription}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {headerActions}
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
            </div>
          }
        />

        <PortalPanel padding={false}>
          <div className="flex items-center gap-3 border-b border-border/40 p-5 dark:border-white/5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <TicketCheck className="h-[18px] w-[18px]" aria-hidden="true" />
            </div>
            <div>
              <PortalEyebrow>{labels.historyLabel}</PortalEyebrow>
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
                  <p className="text-sm font-semibold">{labels.emptyTitle}</p>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    {labels.emptyDescription}
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
                    contactBadgeLabel={labels.contactBadgeLabel}
                    showContactBadge={showContactBadge}
                  />
                ))}
              </ul>
            )}
          </div>
        </PortalPanel>
      </section>

      <TicketDetailDialog
        ticket={selectedTicket}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onTicketUpdated={() => void loadTickets({ force: true })}
      />
    </>
  );
}
