"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Eye, Filter } from "lucide-react";
import Link from "next/link";

const MOCK_REQUESTS = [
  {
    id: "req_101",
    client: "Met Police",
    type: "HM Seats",
    summary: "+3 Additional Seats",
    amount: "£450.00",
    status: "Payment Pending",
    createdBy: "Sarah Jenkins",
    createdDate: "2026-06-01",
  },
  {
    id: "req_102",
    client: "NHS Digital",
    type: "Assessment Module",
    summary: "Add Call Simulation",
    amount: "£1,200.00",
    status: "Draft",
    createdBy: "Mike Ross",
    createdDate: "2026-06-03",
  },
  {
    id: "req_103",
    client: "London Fire Brigade",
    type: "Session Allowance",
    summary: "+1000 Sessions",
    amount: "£850.00",
    status: "Active",
    createdBy: "System",
    createdDate: "2026-05-28",
  },
  {
    id: "req_104",
    client: "BUPA Trust",
    type: "HM Seats",
    summary: "+1 Additional Seat",
    amount: "£150.00",
    status: "Sent",
    createdBy: "Sarah Jenkins",
    createdDate: "2026-06-04",
  }
];

export default function UpgradeRequestsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "Payment Pending": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "Draft": return "bg-gray-500/10 text-gray-500 border-gray-500/20";
      case "Sent": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Upgrade Requests</h3>
          <p className="text-sm text-muted-foreground">Manage client capacity and feature upgrades.</p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search requests..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <Button variant="outline" className="border-dashed"><Filter className="mr-2 h-4 w-4"/> Filter</Button>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_REQUESTS.filter(r => r.client.toLowerCase().includes(searchTerm.toLowerCase())).map((req) => (
              <TableRow key={req.id}>
                <TableCell className="font-medium">{req.client}</TableCell>
                <TableCell>{req.type}</TableCell>
                <TableCell className="text-muted-foreground">{req.summary}</TableCell>
                <TableCell>{req.amount}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(req.status)}>
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{req.createdDate}</div>
                  <div className="text-xs text-muted-foreground">{req.createdBy}</div>
                </TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/admin/upgrade-requests/${req.id}`}>
                      <Eye className="h-4 w-4 mr-2" /> View
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}