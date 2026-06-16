"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { useAdminResource } from "@/lib/admin-resource-cache";
import {
  AdminAlert,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/admin-portal-ui";
import { portalBadgeClass, portalPanelClass } from "@/components/dashboard/portal/portal-design-tokens";

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
    <article className={cn(portalPanelClass, "p-4")}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={portalBadgeClass}>
              {log.event}
            </Badge>
            {log.resource ? (
              <span className="text-xs font-medium text-muted-foreground">
                {log.resource}
                {log.resourceLabel ? `: ${log.resourceLabel}` : ""}
              </span>
            ) : null}
          </div>
          <p className="text-sm leading-relaxed text-foreground">{log.details}</p>
        </div>
        <time
          className="shrink-0 text-xs font-medium text-muted-foreground sm:text-right"
          dateTime={log.rawTimestamp}
        >
          {log.timestamp}
        </time>
      </div>

      <dl className="mt-4 grid gap-3 border-t border-border/50 pt-4 sm:grid-cols-2 dark:border-white/8">
        <div className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Actor
          </dt>
          <dd className="mt-0.5 break-words text-sm font-medium text-foreground">{log.actor}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Client
          </dt>
          <dd className="mt-0.5 break-words text-sm font-medium text-foreground">{log.client}</dd>
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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Audit log"
        description="Every administrative action on the platform, newest first."
        notice={error ? <AdminAlert>{error}</AdminAlert> : null}
      />

      <AdminPanel className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder="Search by actor, event, client, or details…"
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={eventFilter} onValueChange={setEventFilter}>
            <SelectTrigger className="w-full sm:w-[220px]">
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

        <p className="text-xs text-muted-foreground">
          {loading
            ? "Loading entries…"
            : `${filteredLogs.length} of ${logs.length} entries shown`}
        </p>
      </AdminPanel>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-border/60 bg-muted/30"
            />
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <AdminPanel>
          <p className="text-center text-sm text-muted-foreground">
            No audit entries match your search.
          </p>
        </AdminPanel>
      ) : (
        <ul className="space-y-3">
          {filteredLogs.map((log, index) => (
            <li key={`${log.id}-${index}`}>
              <AuditLogEntry log={log} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
