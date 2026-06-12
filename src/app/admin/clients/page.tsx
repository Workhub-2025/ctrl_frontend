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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { cn } from "@/lib/utils";

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
    <div className="max-w-7xl space-y-6">
      {/* Header Area */}
      <HiringManagerPageHeader
        eyebrow="Client Control"
        title="Clients"
        description="Configure organisations, contract capacity, and client onboarding."
        icon={Building2}
        action={
          <div className="flex gap-2.5">
            <Button variant="outline" className="rounded-xl px-4">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button asChild className="bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl px-4">
              <Link href="/admin/clients/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Client
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <SummaryTile icon={Building2} label="Active clients" value={totals.activeClients} color="primary" />
        <SummaryTile icon={Clock3} label="Awaiting signup" value={totals.awaitingSignup} color="cyan" />
        <SummaryTile icon={Gauge} label="Open HM seats" value={totals.openSeats} color="indigo" />
        <SummaryTile icon={KeyRound} label="Pending client invites" value={totals.pendingInvites} color="emerald" />
      </div>

      {/* Filters Area */}
      <div className="flex items-center space-x-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className="pl-9 rounded-xl border-border/70 dark:border-white/10 focus-visible:ring-primary"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="border-dashed rounded-xl px-4">
          Status
        </Button>
        <Button variant="outline" className="border-dashed rounded-xl px-4">
          Plan
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {generatedCode && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 px-5 py-4 text-sm shadow-inner">
          <p className="font-bold text-foreground">Client access code for {generatedCode.clientName}</p>
          <p className="mt-2 font-mono text-lg tracking-wide bg-background dark:bg-black/20 border border-border/60 dark:border-white/5 px-3 py-1.5 rounded-lg w-fit">{generatedCode.code}</p>
          <p className="mt-2 text-xs text-muted-foreground/80">
            Expires {generatedCode.expiresAt ? new Date(generatedCode.expiresAt).toLocaleString("en-GB") : "soon"}.
            This code is shown once.
          </p>
        </div>
      )}

      {/* Data Table */}
      <div className="rounded-2xl border border-border/80 dark:border-white/10 bg-slate-50/50 dark:bg-[#0b1329]/40 backdrop-blur-md shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-100/30 dark:bg-black/10">
              <TableRow className="border-b border-border/40 dark:border-white/5">
                <TableHead className="font-semibold text-foreground">Client</TableHead>
                <TableHead className="font-semibold text-foreground">Onboarding</TableHead>
                <TableHead className="font-semibold text-foreground">Contract</TableHead>
                <TableHead className="font-semibold text-foreground">HM seats</TableHead>
                <TableHead className="font-semibold text-foreground">Approvals</TableHead>
                <TableHead className="font-semibold text-foreground">Client invite</TableHead>
                <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
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
                <TableRow key={`${client.id || "client"}-${index}`} className="border-b border-border/40 dark:border-white/5 hover:bg-slate-100/10 dark:hover:bg-white/[0.02] transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-[18px] w-[18px] text-primary" />
                      <div className="font-semibold text-foreground">{client.name}</div>
                    </div>
                    <div className="text-xs text-muted-foreground/80 mt-1 pl-7">{client.primaryContact}</div>
                    <div className="text-[10px] text-muted-foreground/60 mt-0.5 pl-7">Updated {client.lastActivity}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`rounded-lg font-semibold border px-2.5 py-0.5 ${getStatusColor(client.status)}`}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-semibold text-foreground">{client.plan}</div>
                    <Badge variant="outline" className={`mt-1 rounded-md text-[10px] font-bold px-1.5 py-px ${getBillingColor(client.billingStatus)}`}>
                      {client.billingStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-sm", client.seatsAllowed > 0 && client.seatsUsed >= client.seatsAllowed ? "text-orange-500 font-bold" : "text-foreground font-medium")}>
                        {client.seatsUsed} / {client.seatsAllowed}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/70 mt-1">Occupied / Limit</div>
                  </TableCell>
                  <TableCell>
                    {client.pendingCampaignApprovals > 0 ? (
                      <Badge variant="outline" className="rounded-lg font-semibold border border-orange-500/20 bg-orange-500/10 text-orange-400">
                        {client.pendingCampaignApprovals} pending
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground/75 font-medium">Clear</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ClientInviteState client={client} />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-full">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-[18px] w-[18px]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl border border-border/80 dark:border-white/10 shadow-xl">
                        <DropdownMenuLabel className="text-xs text-muted-foreground font-bold">Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/clients/${client.id}`} className="rounded-lg text-xs font-medium cursor-pointer">Open client</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/upgrade-requests?client=${encodeURIComponent(client.id)}`} className="rounded-lg text-xs font-medium cursor-pointer">
                            Review entitlements
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!client.canGenerateClientCode || generatingClientId === client.id}
                          onClick={() => generateClientCode(client)}
                          className="rounded-lg text-xs font-medium cursor-pointer"
                        >
                          {client.canGenerateClientCode ? "Generate client invite" : "Client invite handled"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  color = "primary",
}: {
  icon: typeof Building2;
  label: string;
  value: number;
  color?: "primary" | "cyan" | "indigo" | "emerald" | "amber" | "red";
}) {
  const colorGradients = {
    primary: "from-primary to-indigo-500 hover:border-primary/30",
    cyan: "from-cyan-500 to-blue-400 hover:border-cyan-500/30",
    indigo: "from-indigo-500 to-purple-400 hover:border-indigo-500/30",
    emerald: "from-emerald-500 to-teal-400 hover:border-emerald-500/30",
    amber: "from-amber-500 to-yellow-400 hover:border-amber-500/30",
    red: "from-red-500 to-pink-500 hover:border-red-500/30",
  };

  const iconColors = {
    primary: "text-primary",
    cyan: "text-cyan-400",
    indigo: "text-indigo-400",
    emerald: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
  };

  return (
    <Card className="relative overflow-hidden rounded-xl border border-border bg-card dark:border-white/10 dark:bg-[#0b1329]/40 dark:backdrop-blur-md shadow-lg transition-all duration-300 hover:scale-[1.01]">
      <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${colorGradients[color]}`} />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
        <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</CardTitle>
        <Icon className={`h-[18px] w-[18px] ${iconColors[color]}`} aria-hidden="true" />
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-1">
        <p className="text-3xl font-black text-foreground">{value}</p>
      </CardContent>
    </Card>
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
