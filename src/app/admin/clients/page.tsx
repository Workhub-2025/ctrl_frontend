"use client";

import { useEffect, useMemo, useState } from "react";
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

type AdminClientRow = {
  id: string;
  name: string;
  status: "Active" | "Paused" | "Expired" | "Pending";
  plan: string;
  seatsUsed: number;
  seatsAllowed: number;
  enabledAssessments: string[];
  billingStatus: "Active" | "Pending" | "Expired" | "Paused";
  primaryContact: string;
  lastActivity: string;
  pendingCampaignApprovals: number;
};

export default function ClientsListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<AdminClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<{
    clientName: string;
    code: string;
    expiresAt: string;
  } | null>(null);
  const [generatingClientId, setGeneratingClientId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/clients", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Clients could not be loaded");
        return Array.isArray(body.data) ? body.data as AdminClientRow[] : [];
      })
      .then((data) => {
        if (!cancelled) {
          setClients(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Clients could not be loaded");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredClients = useMemo(
    () =>
      clients.filter((client) =>
        [client.name, client.primaryContact, client.status, client.plan]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      ),
    [clients, searchTerm]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20";
      case "Pending": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20";
      case "Paused": return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20";
      case "Expired": return "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };

  const getBillingColor = (status: string) => {
    switch (status) {
      case "Paid": return "text-green-500 border-green-500/20";
      case "Active": return "text-green-500 border-green-500/20";
      case "Pending": return "text-yellow-500 border-yellow-500/20";
      case "Expired": return "text-red-500 border-red-500/20";
      case "Paused": return "text-orange-500 border-orange-500/20";
      default: return "text-gray-500";
    }
  };

  const generateClientCode = async (client: AdminClientRow) => {
    setGeneratingClientId(client.id);
    setError(null);
    try {
      const response = await fetch("/api/admin/access-codes/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientDocumentId: client.id }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Client access code could not be generated");
      setGeneratedCode({
        clientName: client.name,
        code: body.data?.code ?? "",
        expiresAt: body.data?.expiresAt ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Client access code could not be generated");
    } finally {
      setGeneratingClientId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
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

      {/* Filters Area */}
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

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {generatedCode && (
        <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 text-sm">
          <p className="font-medium">Client access code for {generatedCode.clientName}</p>
          <p className="mt-2 font-mono text-base tracking-wide">{generatedCode.code}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Expires {generatedCode.expiresAt ? new Date(generatedCode.expiresAt).toLocaleString("en-GB") : "soon"}.
            This code is shown once.
          </p>
        </div>
      )}

      {/* Data Table */}
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
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  Loading clients...
                </TableCell>
              </TableRow>
            )}
            {!loading && filteredClients.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No clients match the current search.
                </TableCell>
              </TableRow>
            )}
            {!loading && filteredClients.map((client, index) => (
              <TableRow key={`${client.id || "client"}-${index}`}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div className="font-medium">{client.name}</div>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{client.primaryContact}</div>
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
                    {client.enabledAssessments.slice(0, 4).map((a, assessmentIndex) => (
                      <Badge key={`${a}-${assessmentIndex}`} variant="secondary" className="text-[10px] px-1 py-0 h-4">
                        {a}
                      </Badge>
                    ))}
                    {client.pendingCampaignApprovals > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-orange-500 border-orange-500/20">
                        {client.pendingCampaignApprovals} pending
                      </Badge>
                    )}
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
                      <DropdownMenuItem
                        disabled={generatingClientId === client.id}
                        onClick={() => generateClientCode(client)}
                      >
                        Generate Client Code
                      </DropdownMenuItem>
                      <DropdownMenuItem>Upgrade Client</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Pause Account</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
