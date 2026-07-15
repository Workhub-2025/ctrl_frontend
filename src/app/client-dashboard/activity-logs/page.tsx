"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Search, SlidersHorizontal, ScrollText } from "lucide-react";
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
import { downloadCsv } from "@/lib/export-csv";
import { cn } from "@/lib/utils";
import {
  ClientPageHeader,
  ClientErrorBanner,
} from "@/components/dashboard/client/client-portal-ui";
import { PortalPanel } from "@/components/dashboard/portal/portal-ui";
import {
  portalBadgeClass,
  portalLabelClass,
  portalPanelClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { PortalLockedPane } from "@/components/dashboard/portal/portal-workspace-ui";

type AuditLogRow = {
  id: string;
  actorUserId: string;
  actorRole: string;
  actionType: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: string;
  actorDisplayName?: string;
  clientDisplayName?: string | null;
  resourceDisplayName?: string | null;
  metadataResolved?: Record<string, string>;
  summary?: string;
};

function ClientAuditEntry({ log }: { log: AuditLogRow }) {
  const metadata = Object.entries(log.metadataResolved ?? {});

  return (
    <article className="px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={portalBadgeClass}>
              {log.actionType}
            </Badge>
            <span className="break-words text-[0.8125rem] font-medium text-muted-foreground">
              {log.resourceDisplayName || log.resource}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground">
            {log.summary ?? "Activity recorded."}
          </p>
          {metadata.length > 0 ? (
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {metadata.map(([key, value]) => (
                <div key={key} className="flex min-w-0 gap-1">
                  <dt className="font-semibold text-muted-foreground">{key}</dt>
                  <dd className="break-words text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
        <time
          className="shrink-0 text-xs tabular-nums text-muted-foreground sm:text-right"
          dateTime={log.occurredAt}
        >
          {new Date(log.occurredAt).toLocaleString()}
        </time>
      </div>

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <div className="flex min-w-0 gap-1.5">
          <dt className="font-semibold text-muted-foreground">Actor</dt>
          <dd className="break-words text-foreground">
            {log.actorDisplayName || log.actorUserId}
          </dd>
        </div>
        <div className="flex min-w-0 gap-1.5">
          <dt className="font-semibold text-muted-foreground">Reference</dt>
          <dd className="break-all font-mono text-foreground">{log.resourceId ?? "Not recorded"}</dd>
        </div>
      </dl>
    </article>
  );
}

export default function ActivityLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/client/audit-logs");
        if (!response.ok) throw new Error("Activity logs could not be loaded");
        const payload = (await response.json()) as { data?: AuditLogRow[] };
        if (!cancelled) setAuditLogs(payload.data ?? []);
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Activity logs could not be loaded."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const resources = useMemo(
    () => Array.from(new Set(auditLogs.map((log) => log.resource).filter(Boolean))).sort(),
    [auditLogs]
  );

  const filteredAuditLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return auditLogs.filter((log) => {
      if (resourceFilter !== "all" && log.resource !== resourceFilter) return false;
      if (!query) return true;

      return [
        log.actorDisplayName,
        log.actorRole,
        log.actionType,
        log.resource,
        log.resourceDisplayName,
        log.summary,
        log.occurredAt,
        log.metadataResolved ? Object.values(log.metadataResolved).join(" ") : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [auditLogs, resourceFilter, searchTerm]);

  const exportAuditCsv = () => {
    downloadCsv(
      `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Timestamp", "Actor", "Action", "Resource", "Resource Name", "Summary", "Details"],
      filteredAuditLogs.map((log) => [
        new Date(log.occurredAt).toLocaleString(),
        log.actorDisplayName ?? log.actorUserId,
        log.actionType,
        log.resource,
        log.resourceDisplayName ?? log.resourceId ?? "",
        log.summary ?? "",
        log.metadataResolved ? JSON.stringify(log.metadataResolved) : "",
      ])
    );
  };

  return (
    <div className="space-y-6">
      <ClientPageHeader
        title="Activity logs"
        description="Configuration, approval, access and account activity for your organisation."
        notice={error ? <ClientErrorBanner>{error}</ClientErrorBanner> : null}
      />

      <PortalLockedPane
        asideLabel="Activity log controls"
        aside={
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Filter activity</h2>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Keep the controls in view while reviewing the audit trail.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-audit-search" className={portalLabelClass}>
                Search
              </Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="client-audit-search"
                  placeholder="Actor, action, resource…"
                  className="pl-9"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label id="client-audit-resource-label" className={portalLabelClass}>
                Resource
              </Label>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger aria-labelledby="client-audit-resource-label">
                  <SelectValue placeholder="All resources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All resources</SelectItem>
                  {resources.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {loading
                  ? "Loading activity…"
                  : `${filteredAuditLogs.length} of ${auditLogs.length} entries shown`}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full justify-start"
                disabled={filteredAuditLogs.length === 0}
                onClick={exportAuditCsv}
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
        ) : filteredAuditLogs.length === 0 ? (
          <PortalPanel className="py-12 text-center">
            <ScrollText className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-foreground">No matching activity</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Change the resource or clear the search term.
            </p>
          </PortalPanel>
        ) : (
          <ol className={cn(portalPanelClass, "divide-y divide-border overflow-hidden")}>
            {filteredAuditLogs.map((log) => (
              <li key={log.id}>
                <ClientAuditEntry log={log} />
              </li>
            ))}
          </ol>
        )}
      </PortalLockedPane>
    </div>
  );
}
