"use client";

import { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Download } from "lucide-react";
import { useAdminResource } from "@/lib/admin-resource-cache";

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Audit Logs</h3>
          <p className="text-sm text-muted-foreground">System-wide ledger of administrative actions.</p>
        </div>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Export Logs</Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs by actor or event..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Button variant="outline" className="border-dashed"><Filter className="mr-2 h-4 w-4"/> Date Range</Button>
        <Button variant="outline" className="border-dashed"><Filter className="mr-2 h-4 w-4"/> Event Type</Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Event Type</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Details</TableHead>
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
              <TableRow key={`${log.id || "audit-log"}-${index}`}>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{log.timestamp}</TableCell>
                <TableCell className="font-medium">{log.actor}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{log.event}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{log.client}</TableCell>
                <TableCell className="text-sm">{log.details}</TableCell>
              </TableRow>
            )) }
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
