"use client";

import { useMemo, useState } from "react";
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
import {
  Building2,
  CheckCircle2,
  Clock3,
  Download,
  Gauge,
  KeyRound,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import Link from "next/link";
import {
  invalidateAdminResource,
  useAdminResource,
} from "@/lib/admin-resource-cache";

type AdminClientRow = {
  id: string;
  name: string;
  status: "Active" | "Awaiting signup" | "Paused" | "Expired" | "Needs contract";
  plan: string;
  seatsUsed: number;
  seatsAllowed: number;
  enabledAssessments: string[];
  billingStatus: "Active" | "Not configured" | "Expired" | "Paused";
  primaryContact: string;
  lastActivity: string;
  pendingCampaignApprovals: number;
  hasClientContact: boolean;
  clientInviteStatus: "none" | "available" | "used" | "expired" | "revoked";
  clientInviteExpiresAt: string | null;
  canGenerateClientCode: boolean;
};

export default function ClientsListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [generatedCode, setGeneratedCode] = useState<{
    clientName: string;
    code: string;
    expiresAt: string;
  } | null>(null);
  const [generatingClientId, setGeneratingClientId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    data: clients,
    error: loadError,
    loading,
    mutate: mutateClients,
  } = useAdminResource<AdminClientRow[]>(
    "admin:clients",
    "/api/admin/clients",
    []
  );
  const error = actionError || loadError;

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

  const totals = useMemo(() => {
    const activeClients = clients.filter((client) => client.status === "Active").length;
    const awaitingSignup = clients.filter((client) => client.status === "Awaiting signup").length;
    const openSeats = clients.reduce(
      (total, client) => total + Math.max(0, client.seatsAllowed - client.seatsUsed),
      0
    );
    const pendingInvites = clients.filter((client) => client.clientInviteStatus === "available").length;

    return { activeClients, awaitingSignup, openSeats, pendingInvites };
  }, [clients]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20";
      case "Awaiting signup": return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20";
      case "Needs contract": return "bg-slate-500/10 text-slate-500 hover:bg-slate-500/20 border-slate-500/20";
      case "Paused": return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20";
      case "Expired": return "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };

  const getBillingColor = (status: string) => {
    switch (status) {
      case "Paid": return "text-green-500 border-green-500/20";
      case "Active": return "text-green-500 border-green-500/20";
      case "Not configured": return "text-slate-500 border-slate-500/20";
      case "Expired": return "text-red-500 border-red-500/20";
      case "Paused": return "text-orange-500 border-orange-500/20";
      default: return "text-gray-500";
    }
  };

  const generateClientCode = async (client: AdminClientRow) => {
    setGeneratingClientId(client.id);
    setActionError(null);
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
      const updatedClients = clients.map((item) =>
          item.id === client.id
            ? {
                ...item,
                status: item.status === "Active" ? item.status : "Awaiting signup" as const,
                clientInviteStatus: "available" as const,
                clientInviteExpiresAt: body.data?.expiresAt ?? null,
                canGenerateClientCode: false,
              }
            : item
      );
      mutateClients(updatedClients);
      invalidateAdminResource("admin:overview");
      invalidateAdminResource("admin:upgrades");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Client access code could not be generated");
    } finally {
      setGeneratingClientId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Client control</h3>
          <p className="text-sm text-muted-foreground">
            Configure organisations, contract capacity, and client onboarding.
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

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryTile icon={Building2} label="Active clients" value={totals.activeClients} />
        <SummaryTile icon={Clock3} label="Awaiting signup" value={totals.awaitingSignup} />
        <SummaryTile icon={Gauge} label="Open HM seats" value={totals.openSeats} />
        <SummaryTile icon={KeyRound} label="Pending client invites" value={totals.pendingInvites} />
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
              <TableHead>Client</TableHead>
              <TableHead>Onboarding</TableHead>
              <TableHead>Contract</TableHead>
              <TableHead>HM seats</TableHead>
              <TableHead>Approvals</TableHead>
              <TableHead>Client invite</TableHead>
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
                  <div className="text-xs text-muted-foreground mt-1">Updated {client.lastActivity}</div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={getStatusColor(client.status)}>
                    {client.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{client.plan}</div>
                  <Badge variant="outline" className={`mt-1 ${getBillingColor(client.billingStatus)}`}>
                    {client.billingStatus}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={client.seatsAllowed > 0 && client.seatsUsed >= client.seatsAllowed ? "text-orange-500 font-medium" : ""}>
                    {client.seatsUsed} / {client.seatsAllowed}
                  </span>
                  <div className="text-xs text-muted-foreground mt-1">Client assigns seat occupants</div>
                </TableCell>
                <TableCell>
                  {client.pendingCampaignApprovals > 0 ? (
                    <Badge variant="outline" className="text-orange-500 border-orange-500/20">
                      {client.pendingCampaignApprovals} pending
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">Clear</span>
                  )}
                </TableCell>
                <TableCell>
                  <ClientInviteState client={client} />
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
                        disabled={!client.canGenerateClientCode || generatingClientId === client.id}
                        onClick={() => generateClientCode(client)}
                      >
                        {client.canGenerateClientCode ? "Generate client invite" : "Client invite handled"}
                      </DropdownMenuItem>
                      <DropdownMenuItem>Adjust seat capacity</DropdownMenuItem>
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

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-cyan-600" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ClientInviteState({ client }: { client: AdminClientRow }) {
  if (client.hasClientContact) {
    return (
      <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Used
      </Badge>
    );
  }

  if (client.clientInviteStatus === "available") {
    return (
      <div className="space-y-1">
        <Badge variant="outline" className="border-blue-500/20 bg-blue-500/10 text-blue-600">
          <Clock3 className="mr-1 h-3 w-3" />
          Pending
        </Badge>
        <p className="text-xs text-muted-foreground">
          Expires {client.clientInviteExpiresAt ? new Date(client.clientInviteExpiresAt).toLocaleDateString("en-GB") : "soon"}
        </p>
      </div>
    );
  }

  return <span className="text-sm text-muted-foreground">No active invite</span>;
}
