"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Search, Download, Building2 } from "lucide-react";
import Link from "next/link";

// Mock Data
const MOCK_CLIENTS = [
  {
    id: "c_1",
    name: "Met Police",
    status: "Active",
    plan: "Enterprise",
    seatsUsed: 4,
    seatsAllowed: 5,
    enabledAssessments: ["Typing", "SJT", "Call Simulation"],
    billingStatus: "Paid",
    primaryContact: "j.smith@met.police.uk",
    lastActivity: "2 hours ago",
  },
  {
    id: "c_2",
    name: "NHS Digital",
    status: "Active",
    plan: "Professional",
    seatsUsed: 12,
    seatsAllowed: 15,
    enabledAssessments: ["Typing", "Prioritization"],
    billingStatus: "Pending",
    primaryContact: "sarah.j@nhs.net",
    lastActivity: "1 day ago",
  },
  {
    id: "c_3",
    name: "London Fire Brigade",
    status: "Trial",
    plan: "Standard",
    seatsUsed: 2,
    seatsAllowed: 2,
    enabledAssessments: [ "SJT"],
    billingStatus: "Comped",
    primaryContact: "admin@london-fire.gov.uk",
    lastActivity: "3 days ago",
  },
  {
    id: "c_4",
    name: "BUPA Trust",
    status: "Paused",
    plan: "Custom",
    seatsUsed: 1,
    seatsAllowed: 10,
    enabledAssessments: ["Typing", "Call Simulation"],
    billingStatus: "Overdue",
    primaryContact: "billing@bupa.co.uk",
    lastActivity: "2 weeks ago",
  },
];

export default function ClientsListPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20";
      case "Trial": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20";
      case "Paused": return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20";
      case "Expired": return "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };

  const getBillingColor = (status: string) => {
    switch (status) {
      case "Paid": return "text-green-500 border-green-500/20";
      case "Pending": return "text-yellow-500 border-yellow-500/20";
      case "Overdue": return "text-red-500 border-red-500/20";
      case "Comped": return "text-blue-500 border-blue-500/20";
      default: return "text-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      (* Header Area *)
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Clients</h3>
          <p className="text-sm text-muted-foreground">
            Manage organizations, contracts, and platform access.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button asChild className="bg-cyan-600 hover:bg-cyan-700 text-white">
            <Link href="/admin/clients/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Client
            </Link>
          </Button>
        </div>
      </div>

      (* Filters Area *)
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="border-dashed">
          Status
        </Button>
        <Button variant="outline" className="border-dashed">
          Plan
        </Button>
      </div>

      (* Data Table *)
      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Assessments</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_CLIENTS.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map((client) => (
              <TableRow key={client.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div className="font-medium">{client.name}</div>
                  </div>
                  <div className="teyt-xs text-muted-foreground mt-1">{client.primaryContact}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(client.status)}>
                    {client.status}
                  </Badge>
                </TableCell>
                <TableCell>{client.plan}</TableCell>
                <TableCell>
                  <span className={client.seatsUsed >= client.seatsAllowed ? "text-orange-500 font-medium" : ""}>
                    {client.seatsUsed} / {client.seatsAllowed}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap max-w-[150px]">
                    {client.enabledAssessments.map(a => (
                      <Badge key={a} variant="secondary" className="text-[10px] px-1 py-0 h-4">
                        {a}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getBillingColor(client.billingStatus)}>
                    {client.billingStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/clients/${client.id}`}>View Details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>Upgrade Client</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Pause Account</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
