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
import { invalidateAdminResource, useAdminResource } from "@/lib/admin-resource-cache";
import {
  AdminAlert,
  AdminPageHeader,
  AdminStatTile,
  AdminTableShell,
} from "@/components/admin/admin-portal-ui";
import { portalBadgeClass, portalInputClass, portalStatusBadge } from "@/components/dashboard/portal/portal-design-tokens";
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

  const statusBadgeClass = portalStatusBadge;

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
      <AdminPageHeader
        title="All clients"
        description="Organisations, contracts, seat capacity, and onboarding invites."
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-lg">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button asChild className="rounded-lg">
              <Link href="/admin/clients/create">
                <Plus className="mr-2 h-4 w-4" />
                Add client
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <AdminStatTile icon={Building2} label="Active clients" value={totals.activeClients} />
        <AdminStatTile icon={Clock3} label="Awaiting signup" value={totals.awaitingSignup} />
        <AdminStatTile icon={Gauge} label="Open HM seats" value={totals.openSeats} />
        <AdminStatTile icon={KeyRound} label="Pending client invites" value={totals.pendingInvites} />
      </div>

      {/* Filters Area */}
      <div className="flex items-center space-x-2.5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            className={cn("pl-9", portalInputClass)}
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

      {error ? <AdminAlert>{error}</AdminAlert> : null}
      {generatedCode ? (
        <AdminAlert tone="info">
          <p className="font-semibold">Client access code for {generatedCode.clientName}</p>
          <p className="mt-2 w-fit rounded-lg border border-border/60 bg-background px-3 py-1.5 font-mono text-lg tracking-wide dark:bg-black/20">
            {generatedCode.code}
          </p>
          <p className="mt-2 text-xs opacity-80">
            Expires {generatedCode.expiresAt ? new Date(generatedCode.expiresAt).toLocaleString("en-GB") : "soon"}.
            This code is shown once.
          </p>
        </AdminAlert>
      ) : null}

      <AdminTableShell>
          <Table>
            <TableHeader>
              <TableRow>
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
                <TableRow key={`${client.id || "client"}-${index}`}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-[18px] w-[18px] text-primary" />
                      <div className="font-semibold text-foreground">{client.name}</div>
                    </div>
                    <div className="text-xs text-muted-foreground/80 mt-1 pl-7">{client.primaryContact}</div>
                    <div className="text-[10px] text-muted-foreground/60 mt-0.5 pl-7">Updated {client.lastActivity}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusBadgeClass(client.status)}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-semibold text-foreground">{client.plan}</div>
                    <Badge variant="outline" className={cn("mt-1", portalBadgeClass)}>
                      {client.billingStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-foreground">
                        {client.seatsUsed} / {client.seatsAllowed}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground/70 mt-1">Occupied / Limit</div>
                  </TableCell>
                  <TableCell>
                    {client.pendingCampaignApprovals > 0 ? (
                      <Badge variant="outline" className={portalBadgeClass}>
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
      </AdminTableShell>
    </div>
  );
}

function ClientInviteState({ client }: { client: AdminClientRow }) {
  if (client.hasClientContact) {
    return (
      <Badge variant="outline" className={portalBadgeClass}>
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Used
      </Badge>
    );
  }

  if (client.clientInviteStatus === "available") {
    return (
      <div className="space-y-1">
        <Badge variant="outline" className={portalBadgeClass}>
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
