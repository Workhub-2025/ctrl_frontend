"use client";

import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Download } from "lucide-react";
import { useAdminResource } from "@/lib/admin-resource-cache";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";

type AuditLogRow = {
  id: string;
  actor: string;
  timestamp: string;
  event: string;
  client: string;
  details: string;
};

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: logs, error, loading } = useAdminResource<AuditLogRow[]>(
    "admin:audit-logs",
    "/api/admin/audit-logs",
    []
  );

  const filteredLogs = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return logs;

    return logs.filter((log) =>
      [log.actor, log.event, log.client, log.details]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [logs, searchTerm]);

  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Audit logs"
        title="Audit Logs"
        description="System-wide ledger of administrative actions."
        icon={Search}
        action={
          <Button variant="outline" className="rounded-xl px-4">
            <Download className="mr-2 h-4 w-4" /> Export Logs
          </Button>
        }
      />

      <div className="flex items-center space-x-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search logs by actor or event..."
            className="pl-9 rounded-xl border-border/70 dark:border-white/10 focus-visible:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="border-dashed rounded-xl px-4">
          <Filter className="mr-2 h-4 w-4 text-muted-foreground" /> Date Range
        </Button>
        <Button variant="outline" className="border-dashed rounded-xl px-4">
          <Filter className="mr-2 h-4 w-4 text-muted-foreground" /> Event Type
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-border/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b1329]/40 backdrop-blur-md shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-100/30 dark:bg-black/10">
              <TableRow className="border-b border-border/40 dark:border-white/5">
                <TableHead className="font-semibold text-foreground">Timestamp</TableHead>
                <TableHead className="font-semibold text-foreground">Actor</TableHead>
                <TableHead className="font-semibold text-foreground">Event Type</TableHead>
                <TableHead className="font-semibold text-foreground">Client</TableHead>
                <TableHead className="font-semibold text-foreground">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Loading audit logs...
                  </TableCell>
                </TableRow>
              )}
              {!loading && filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No audit logs match the current search.
                  </TableCell>
                </TableRow>
              )}
              {!loading && filteredLogs.map((log, index) => (
                <TableRow key={`${log.id || "audit-log"}-${index}`} className="border-b border-border/40 dark:border-white/5 hover:bg-slate-100/10 dark:hover:bg-white/[0.02] transition-colors">
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{log.timestamp}</TableCell>
                  <TableCell className="font-semibold text-foreground">{log.actor}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-lg font-semibold bg-slate-100 dark:bg-white/10 text-foreground border-none px-2.5 py-0.5">
                      {log.event}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.client}</TableCell>
                  <TableCell className="text-xs leading-relaxed max-w-md break-words">{log.details}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
