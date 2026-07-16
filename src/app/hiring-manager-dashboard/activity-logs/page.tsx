"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ScrollText } from "lucide-react";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { portalPanelClass } from "@/components/dashboard/portal/portal-design-tokens";

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

export default function HiringManagerActivityLogsPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/hiring-manager/audit-logs", { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as { data?: AuditLogRow[]; error?: string };
        if (!response.ok) throw new Error(body.error || "Activity logs could not be loaded");
        if (!cancelled) setLogs(body.data ?? []);
      })
      .catch((loadError) => { if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Activity logs could not be loaded"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return logs;
    return logs.filter((log) => [log.actorDisplayName, log.actionType, log.resourceDisplayName, log.summary]
      .filter(Boolean).join(" ").toLowerCase().includes(normalized));
  }, [logs, query]);

  return (
    <div className="space-y-6">
      <HiringManagerPageHeader eyebrow="Operational record" title="Activity logs" description="Your campaign activity, candidate lifecycle milestones and relevant client decisions." icon={ScrollText} />
      {error ? <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      <div className="max-w-xl space-y-2">
        <Label htmlFor="hm-activity-search">Search activity</Label>
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id="hm-activity-search" className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Actor, action or campaign…" /></div>
      </div>
      <div className={portalPanelClass} aria-busy={loading}>
        {loading ? <p className="p-5 text-sm text-muted-foreground" role="status">Loading activity…</p> : filtered.length === 0 ? <p className="p-5 text-sm text-muted-foreground">No matching activity.</p> : <ol className="divide-y divide-border">{filtered.map((log) => <li key={log.documentId ?? log.id ?? `${log.actionType}-${log.occurredAt}`} className="p-5"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{log.actionType}</Badge><span className="break-words text-xs text-muted-foreground">{log.resourceDisplayName || log.resource}</span></div><p className="mt-2 break-words text-sm leading-6 text-foreground">{log.summary || "Activity recorded."}</p><p className="mt-1 break-words text-xs text-muted-foreground">{log.actorDisplayName || "Platform user"}</p></div><time className="shrink-0 text-xs tabular-nums text-muted-foreground" dateTime={log.occurredAt}>{ACTIVITY_DATE_FORMAT.format(new Date(log.occurredAt))}</time></div></li>)}</ol>}
      </div>
    </div>
  );
}
