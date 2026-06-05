"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, History, Download } from "lucide-react";

const MOCK_LOGS = [
  { id: "log_1", actor: "Sarah Jenkins", timestamp: "2026-06-04 14:32", event: "Upgrade Activated", client: "Met Police", details: "Activated +3 HM Seats" },
  { id: "log_2", actor: "System", timestamp: "2026-06-04 12:00", event: "Invoice Paid", client: "Met Police", details: "Invoice #1042 marked as Paid" },
  { id: "log_3", actor: "Mike Ross", timestamp: "2026-06-03 09:15", event: "Module Enabled", client: "NHS Digital", details: "Call Simulation module enabled" },
  { id: "log_4", actor: "Sarah Jenkins", timestamp: "2026-06-02 16:45", event: "Role Changed", client: "London Fire Brigade", details: "Emma Wilson role changed to Client Admin" },
  { id: "log_5", actor: "John Smith", timestamp: "2026-06-01 10:30", event: "Upgrade Requested", client: "Met Police", details: "Requested +3 HM Seats" },
];

export default function AuditLogsPage() {
  const [searchTerm, setSearchTerm] = useState("");

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
            {MOCK_LOGS.filter(l => l.actor.toLowerCase().includes(searchTerm.toLowerCase()) || l.event.toLowerCase().includes(searchTerm.toLowerCase())).map((log) => (
              <TableRow key={log.id}>
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