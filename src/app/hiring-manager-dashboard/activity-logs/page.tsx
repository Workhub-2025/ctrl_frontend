"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, ScrollText, Search, SlidersHorizontal } from "lucide-react";
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
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { HmErrorBanner } from "@/components/dashboard/hiring-manager-portal-ui";
import {
  PortalLoadingPanel,
  PortalPanel,
} from "@/components/dashboard/portal/portal-ui";
import {
  portalBadgeClass,
  portalLabelClass,
  portalPanelClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { PortalLockedPane } from "@/components/dashboard/portal/portal-workspace-ui";

type AuditLogRow = {
  id?: string;
  documentId?: string;
  actorUserId: string;
  actorRole: string;
  actionType: string;
  resource: string;
  occurredAt: string;
  actorDisplayName?: string;
  resourceDisplayName?: string | null;
  summary?: string;
};

const ACTIVITY_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});

function HmAuditEntry({ log }: { log: AuditLogRow }) {
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
            {log.summary || "Activity recorded."}
          </p>
          <p className="mt-1 break-words text-xs text-muted-foreground">
            {log.actorDisplayName || "Platform user"}
          </p>
        </div>
        <time
          className="shrink-0 text-xs tabular-nums text-muted-foreground sm:text-right"
          dateTime={log.occurredAt}
        >
          {ACTIVITY_DATE_FORMAT.format(new Date(log.occurredAt))}
        </time>
      </div>
    </article>
  );
}

export default function HiringManagerActivityLogsPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/hiring-manager/audit-logs", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as {
          data?: AuditLogRow[];
          error?: string;
        };
        if (!response.ok) throw new Error(body.error || "Activity logs could not be loaded");
        if (!cancelled) setLogs(body.data ?? []);
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Activity logs could not be loaded"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return logs;
    return logs.filter((log) =>
      [log.actorDisplayName, log.actionType, log.resourceDisplayName, log.summary]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }, [logs, query]);

  const exportAuditCsv = () => {
    downloadCsv(
      `hm-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Timestamp", "Actor", "Action", "Resource", "Summary"],
      filtered.map((log) => [
        ACTIVITY_DATE_FORMAT.format(new Date(log.occurredAt)),
        log.actorDisplayName ?? log.actorUserId,
        log.actionType,
        log.resourceDisplayName ?? log.resource,
        log.summary ?? "",
      ])
    );
  };

  return (
    <div className="space-y-6">
      <HiringManagerPageHeader
        eyebrow="Operational record"
        title="Activity logs"
        description="Your campaign activity, candidate lifecycle milestones and relevant client decisions."
        icon={ScrollText}
        notice={error ? <HmErrorBanner>{error}</HmErrorBanner> : undefined}
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
                  Search while keeping the audit trail in view.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hm-activity-search" className={portalLabelClass}>
                Search
              </Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  id="hm-activity-search"
                  className="pl-9"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Actor, action or campaign…"
                />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {loading
                  ? "Loading activity…"
                  : `${filtered.length} of ${logs.length} entries shown`}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full justify-start"
                disabled={filtered.length === 0}
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
          <PortalLoadingPanel message="Loading activity…" />
        ) : filtered.length === 0 ? (
          <PortalPanel className="py-12 text-center">
            <ScrollText className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-foreground">No matching activity</p>
            <p className="mt-1 text-xs text-muted-foreground">Clear the search term to see all entries.</p>
          </PortalPanel>
        ) : (
          <ol className={cn(portalPanelClass, "divide-y divide-border overflow-hidden")}>
            {filtered.map((log) => (
              <li key={log.documentId ?? log.id ?? `${log.actionType}-${log.occurredAt}`}>
                <HmAuditEntry log={log} />
              </li>
            ))}
          </ol>
        )}
      </PortalLockedPane>
    </div>
  );
}
