"use client";

import { useMemo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Download, AlertTriangle, ScrollText } from "lucide-react";
import { downloadCsv } from "@/lib/export-csv";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ClientPageHeader,
  ClientErrorBanner,
} from "@/components/dashboard/client/client-portal-ui";
import { PortalPanel } from "@/components/dashboard/portal/portal-ui";
import { portalBadgeClass, portalPanelClass } from "@/components/dashboard/portal/portal-design-tokens";

type AuditLogRow = {
  id: string;
  actorUserId: string;
  actorRole: string;
  actionType: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, any> | null;
  occurredAt: string;
  actorDisplayName?: string;
  clientDisplayName?: string | null;
  resourceDisplayName?: string | null;
  metadataResolved?: Record<string, string>;
};

type IntegrityEventRow = {
  id: string;
  assessmentType: string;
  eventType: string;
  metadata?: Record<string, any> | null;
  occurredAt: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  users_permissions_user?: {
    id: number;
    documentId: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

export default function ActivityLogsPage() {
  const [activeTab, setActiveTab] = useState<"audit" | "integrity">("audit");
  const [searchTerm, setSearchTerm] = useState("");
  
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [integrityEvents, setIntegrityEvents] = useState<IntegrityEventRow[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [auditRes, integrityRes] = await Promise.all([
        fetch("/api/client/audit-logs"),
        fetch("/api/client/integrity-events"),
      ]);

      if (!auditRes.ok || !integrityRes.ok) {
        throw new Error("Failed to load logs");
      }

      const auditData = await auditRes.json();
      const integrityData = await integrityRes.json();

      setAuditLogs(auditData.data ?? []);
      setIntegrityEvents(integrityData.data ?? []);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred while loading activity logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredAuditLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return auditLogs;

    return auditLogs.filter((log) => {
      const searchString = [
        log.actorDisplayName,
        log.actorRole,
        log.actionType,
        log.resource,
        log.resourceDisplayName,
        log.occurredAt,
        log.metadataResolved ? Object.values(log.metadataResolved).join(" ") : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchString.includes(query);
    });
  }, [auditLogs, searchTerm]);

  const filteredIntegrityEvents = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return integrityEvents;

    return integrityEvents.filter((ev) => {
      const candidateName = ev.users_permissions_user
        ? `${ev.users_permissions_user.firstName} ${ev.users_permissions_user.lastName}`
        : "";
      const searchString = [
        candidateName,
        ev.users_permissions_user?.email,
        ev.assessmentType,
        ev.eventType,
        ev.ipAddress,
        ev.userAgent,
        ev.occurredAt,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return searchString.includes(query);
    });
  }, [integrityEvents, searchTerm]);

  const exportAuditCsv = () => {
    downloadCsv(
      `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Timestamp", "Actor", "Action", "Resource", "Resource Name", "Details"],
      filteredAuditLogs.map((log) => [
        new Date(log.occurredAt).toLocaleString(),
        log.actorDisplayName ?? log.actorUserId,
        log.actionType,
        log.resource,
        log.resourceDisplayName ?? log.resourceId ?? "",
        log.metadataResolved ? JSON.stringify(log.metadataResolved) : "",
      ])
    );
  };

  const exportIntegrityCsv = () => {
    downloadCsv(
      `integrity-events-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Timestamp", "Candidate", "Email", "Assessment", "Event Type", "IP Address", "User Agent"],
      filteredIntegrityEvents.map((ev) => [
        new Date(ev.occurredAt).toLocaleString(),
        ev.users_permissions_user
          ? `${ev.users_permissions_user.firstName} ${ev.users_permissions_user.lastName}`
          : "Unknown",
        ev.users_permissions_user?.email ?? "",
        ev.assessmentType,
        ev.eventType,
        ev.ipAddress ?? "",
        ev.userAgent ?? "",
      ])
    );
  };

  return (
    <div className="space-y-6">
      <ClientPageHeader
        title="Activity logs"
        description="Monitor system configuration changes and track candidate assessment session integrity events."
        notice={error ? <ClientErrorBanner>{error}</ClientErrorBanner> : null}
      />

      <div className="flex border-b border-border/50 dark:border-white/8">
        <button
          type="button"
          onClick={() => {
            setActiveTab("audit");
            setSearchTerm("");
          }}
          className={cn(
            "flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-none",
            activeTab === "audit"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <ScrollText className="h-4 w-4" />
          Audit Trail
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("integrity");
            setSearchTerm("");
          }}
          className={cn(
            "flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline-none",
            activeTab === "integrity"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <AlertTriangle className="h-4 w-4" />
          Session Integrity Alerts
        </button>
      </div>

      <PortalPanel className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              placeholder={
                activeTab === "audit"
                  ? "Search by actor, action, resource, or details…"
                  : "Search by candidate, email, event type, or IP…"
              }
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={
              activeTab === "audit"
                ? filteredAuditLogs.length === 0
                : filteredIntegrityEvents.length === 0
            }
            onClick={activeTab === "audit" ? exportAuditCsv : exportIntegrityCsv}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          {loading
            ? "Loading logs…"
            : activeTab === "audit"
            ? `${filteredAuditLogs.length} of ${auditLogs.length} audit entries shown`
            : `${filteredIntegrityEvents.length} of ${integrityEvents.length} integrity alerts shown`}
        </p>
      </PortalPanel>

      {loading ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl border border-border/60 bg-muted/30"
            />
          ))}
        </div>
      ) : activeTab === "audit" ? (
        filteredAuditLogs.length === 0 ? (
          <PortalPanel>
            <p className="text-center text-sm text-muted-foreground">
              No audit logs found.
            </p>
          </PortalPanel>
        ) : (
          <ul className="space-y-3">
            {filteredAuditLogs.map((log) => (
              <li key={log.id} className={cn(portalPanelClass, "p-4")}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={portalBadgeClass}>
                        {log.actionType}
                      </Badge>
                      <span className="text-xs font-medium text-muted-foreground">
                        {log.resource}
                        {log.resourceDisplayName ? `: ${log.resourceDisplayName}` : ""}
                      </span>
                    </div>
                    <div className="text-sm leading-relaxed text-foreground">
                      {log.metadataResolved ? (
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {Object.entries(log.metadataResolved).map(([k, v]) => (
                            <span key={k} className="text-xs">
                              <span className="font-semibold text-muted-foreground">{k}</span>: {v}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No extra details available</span>
                      )}
                    </div>
                  </div>
                  <time className="shrink-0 text-xs font-medium text-muted-foreground sm:text-right">
                    {new Date(log.occurredAt).toLocaleString()}
                  </time>
                </div>

                <dl className="mt-4 grid gap-3 border-t border-border/50 pt-4 sm:grid-cols-2 dark:border-white/8">
                  <div className="min-w-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Actor
                    </dt>
                    <dd className="mt-0.5 break-words text-sm font-medium text-foreground">
                      {log.actorDisplayName}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Resource ID
                    </dt>
                    <dd className="mt-0.5 break-words text-sm font-mono text-xs text-foreground">
                      {log.resourceId ?? "N/A"}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )
      ) : filteredIntegrityEvents.length === 0 ? (
        <PortalPanel>
          <p className="text-center text-sm text-muted-foreground">
            No session integrity alerts found.
          </p>
        </PortalPanel>
      ) : (
        <ul className="space-y-3">
          {filteredIntegrityEvents.map((ev) => (
            <li key={ev.id} className={cn(portalPanelClass, "p-4")}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="destructive" className="bg-red-500/15 text-red-500 hover:bg-red-500/15 border-none">
                      {ev.eventType}
                    </Badge>
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      {ev.assessmentType}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground">
                    {ev.metadata?.reason ?? "Candidate triggered anomaly event."}
                  </p>
                </div>
                <time className="shrink-0 text-xs font-medium text-muted-foreground sm:text-right">
                  {new Date(ev.occurredAt).toLocaleString()}
                </time>
              </div>

              <dl className="mt-4 grid gap-3 border-t border-border/50 pt-4 sm:grid-cols-3 dark:border-white/8">
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Candidate
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-medium text-foreground">
                    {ev.users_permissions_user
                      ? `${ev.users_permissions_user.firstName} ${ev.users_permissions_user.lastName}`
                      : "Unknown"}
                  </dd>
                  <span className="text-xs text-muted-foreground">{ev.users_permissions_user?.email}</span>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    IP Address
                  </dt>
                  <dd className="mt-0.5 break-words text-sm font-mono text-xs text-foreground">
                    {ev.ipAddress ?? "N/A"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    User Agent
                  </dt>
                  <dd className="mt-0.5 truncate text-xs text-muted-foreground" title={ev.userAgent}>
                    {ev.userAgent ?? "N/A"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
