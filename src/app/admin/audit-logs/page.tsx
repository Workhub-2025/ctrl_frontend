"use client";

import { useMemo, useState } from "react";
import { Download, History, Search, SlidersHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminResource } from "@/lib/admin-resource-cache";
import { downloadCsv } from "@/lib/export-csv";
import {
  AdminAlert,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/admin-portal-ui";
import {
  portalBadgeClass,
  portalLabelClass,
  portalPanelClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { PortalLockedPane } from "@/components/dashboard/portal/portal-workspace-ui";
import { cn } from "@/lib/utils";

type AuditLogRow = {
  id: string;
  actor: string;
  actorRole?: string;
  timestamp: string;
  rawTimestamp?: string;
  event: string;
  eventKey?: string;
  client: string;
  resource?: string;
  resourceLabel?: string;
  details: string;
};

function AuditLogEntry({ log }: { log: AuditLogRow }) {
  return (
    <article className="px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={portalBadgeClass}>
              {log.event}
            </Badge>
            {log.resource ? (
              <span className="break-words text-[0.8125rem] font-medium text-muted-foreground">
                {log.resourceLabel || log.resource}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{log.details}</p>
        </div>
        <time
          className="shrink-0 text-xs tabular-nums text-muted-foreground sm:text-right"
          dateTime={log.rawTimestamp}
        >
          {log.timestamp}
        </time>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <div className="flex min-w-0 gap-1.5">
          <dt className="font-semibold text-muted-foreground">Actor</dt>
          <dd className="break-words text-foreground">{log.actor}</dd>
        </div>
        <div className="flex min-w-0 gap-1.5">
          <dt className="font-semibold text-muted-foreground">Client</dt>
          <dd className="break-words text-foreground">{log.client}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [eventFilter, setEventFilter] = useState("all");
  const { data: logs, error, loading } = useAdminResource<AuditLogRow[]>(
    "admin:audit-logs",
    "/api/admin/audit-logs",
    []
  );

  const eventTypes = useMemo(() => {
    const unique = new Set(logs.map((log) => log.event).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesEvent = eventFilter === "all" || log.event === eventFilter;
      if (!matchesEvent) return false;
      if (!query) return true;

      return [log.actor, log.event, log.client, log.details, log.resource, log.resourceLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [logs, searchTerm, eventFilter]);

  const exportLogs = () => {
    downloadCsv(
      `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Timestamp", "Event", "Actor", "Client", "Resource", "Details"],
      filteredLogs.map((log) => [
        log.timestamp,
        log.event,
        log.actor,
        log.client,
        log.resourceLabel ?? log.resource ?? "",
        log.details,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit log"
        description="Platform activity, ordered newest first. Filter the record without losing your place in the ledger."
        notice={error ? <AdminAlert>{error}</AdminAlert> : null}
      />

      <PortalLockedPane
        asideLabel="Audit log controls"
        aside={
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Filter the record</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Controls stay available while the activity ledger scrolls.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="audit-search" className={portalLabelClass}>
                Search
              </Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="audit-search"
                  placeholder="Actor, client, event…"
                  className="pl-9"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label id="audit-event-label" className={portalLabelClass}>
                Event type
              </Label>
              <Select value={eventFilter} onValueChange={setEventFilter}>
                <SelectTrigger aria-labelledby="audit-event-label">
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All events</SelectItem>
                  {eventTypes.map((event) => (
                    <SelectItem key={event} value={event}>
                      {event}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {loading
                  ? "Loading entries…"
                  : `${filteredLogs.length} of ${logs.length} entries shown`}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full justify-start"
                disabled={filteredLogs.length === 0}
                onClick={exportLogs}
              >
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Export filtered CSV
              </Button>
            </div>
          </div>
        }
      >
        {loading ? (
          <div className={cn(portalPanelClass, "divide-y divide-border")} aria-busy="true">
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className="space-y-3 px-5 py-5">
                <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-muted/70" />
                <div className="h-3 w-64 animate-pulse rounded bg-muted/50" />
              </div>
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <AdminPanel className="py-12 text-center">
            <History className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-foreground">No matching activity</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Change the event type or clear the search term.
            </p>
          </AdminPanel>
        ) : (
          <ol className={cn(portalPanelClass, "divide-y divide-border overflow-hidden")}>
            {filteredLogs.map((log, index) => (
              <li key={`${log.id}-${index}`}>
                <AuditLogEntry log={log} />
              </li>
            ))}
          </ol>
        )}
      </PortalLockedPane>
    </div>
  );
}
