"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Trash2,
  CheckCircle2,
  Clock3,
  SlidersHorizontal,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { invalidateAdminResource, useAdminResource } from "@/lib/admin-resource-cache";

type ClientDetails = {
  id: string;
  name: string;
  legalName: string;
  status: string;
  seatsUsed: number;
  seatsAllowed: number;
  billingStatus: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  address: string;
  timeZone: string;
  campaignApprovalMode: "auto_approve" | "require_approval";
  onboardingCompleted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  pendingCampaignApprovals: number;
  hasClientContact: boolean;
  clientInviteStatus: "none" | "available" | "used" | "expired" | "revoked";
  clientInviteExpiresAt: string | null;
  canGenerateClientCode: boolean;
  activeContract: {
    status: string;
    startDate: string | null;
    endDate: string | null;
    seatCount: number;
    notes: string;
  } | null;
  users: Array<{ id: string; name: string; email: string; role: string; status: string }>;
  campaigns: Array<{ id: string; title: string; status: string; approvalStatus: string; createdAt: string | null }>;
  accessCodes: Array<{ id: string; status: string; targetRole: string; expiresAt: string | null; createdAt: string | null }>;
};

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusClass(status: string) {
  switch (status.toLowerCase()) {
    case "active":
    case "approved":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-600";
    case "pending":
    case "awaiting signup":
      return "border-blue-500/20 bg-blue-500/10 text-blue-600";
    case "paused":
    case "rejected":
      return "border-orange-500/20 bg-orange-500/10 text-orange-600";
    case "expired":
    case "disabled":
      return "border-red-500/20 bg-red-500/10 text-red-600";
    case "needs contract":
      return "border-slate-500/20 bg-slate-500/10 text-slate-600";
    default:
      return "border-muted-foreground/20 text-muted-foreground";
  }
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const [activeTab, setActiveTab] = useState("summary");
  const {
    data: client,
    error: loadError,
    loading,
    mutate: mutateClient,
  } = useAdminResource<ClientDetails | null>(
    `admin:client:${clientId}`,
    `/api/admin/clients/${encodeURIComponent(clientId)}`,
    null
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = useMemo(
    () => Boolean(client?.name && confirmName === client.name),
    [client?.name, confirmName]
  );
  const error = actionError || loadError;

  const generateClientCode = async () => {
    setGeneratingCode(true);
    setActionError(null);
    try {
      const response = await fetch("/api/admin/access-codes/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientDocumentId: clientId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Client access code could not be generated");
      setGeneratedCode({
        code: body.data?.code ?? "",
        expiresAt: body.data?.expiresAt ?? "",
      });
      mutateClient(
        client
          ? {
            ...client,
            status: client.status === "Active" ? client.status : "Awaiting signup",
            clientInviteStatus: "available",
            clientInviteExpiresAt: body.data?.expiresAt ?? null,
            canGenerateClientCode: false,
          }
          : client
      );
      invalidateAdminResource("admin:clients");
      invalidateAdminResource("admin:overview");
      invalidateAdminResource("admin:upgrades");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Client access code could not be generated");
    } finally {
      setGeneratingCode(false);
    }
  };

  const deleteClient = async () => {
    if (!client || !canDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/admin/clients/${encodeURIComponent(client.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Client could not be deleted");
      invalidateAdminResource("admin:clients");
      invalidateAdminResource("admin:overview");
      invalidateAdminResource("admin:upgrades");
      router.push("/admin/clients");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Client could not be deleted");
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading client...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" className="gap-2 px-0">
          <Link href="/admin/clients">
            <ArrowLeft className="h-4 w-4" />
            Back to clients
          </Link>
        </Button>
        <div className="rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error || "Client could not be loaded"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" className="gap-2 px-0">
        <Link href="/admin/clients">
          <ArrowLeft className="h-4 w-4" />
          Back to clients
        </Link>
      </Button>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {generatedCode && (
        <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 text-sm">
          <p className="font-medium">Client access code for {client.name}</p>
          <p className="mt-2 break-all font-mono text-base font-semibold">{generatedCode.code}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Expires {generatedCode.expiresAt ? new Date(generatedCode.expiresAt).toLocaleString("en-GB") : "soon"}.
            This code is shown once.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cyan-500/10">
            <Building2 className="h-6 w-6 text-cyan-500" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">{client.name}</h1>
              <Badge variant="outline" className={statusClass(client.status)}>
                {client.status}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {client.primaryContactEmail}
              </span>
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                {client.primaryContactPhone}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={`/admin/upgrade-requests?client=${encodeURIComponent(client.id)}`}>
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Review entitlements
            </Link>
          </Button>
          <ClientInviteAction
            client={client}
            generatingCode={generatingCode}
            onGenerate={generateClientCode}
          />
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-red-500/30 text-red-600 hover:text-red-700">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Client
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {client.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the client, contract, and unused access codes. Clients with users or campaigns attached cannot be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="space-y-2">
                <Label htmlFor="confirmClientName">Type the client name to confirm</Label>
                <Input
                  id="confirmClientName"
                  value={confirmName}
                  onChange={(event) => setConfirmName(event.target.value)}
                  placeholder={client.name}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={deleteClient}
                  disabled={!canDelete || deleting}
                >
                  {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete client
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0">
          {["summary", "contract", "users", "campaigns", "access"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent px-3 py-3 capitalize data-[state=active]:border-cyan-500 data-[state=active]:shadow-none"
            >
              {tab === "access" ? "Access codes" : tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="summary" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Contract state</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{client.billingStatus}</div>
                <p className="mt-1 text-xs text-muted-foreground">Derived from the active contract</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Hiring manager seats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{client.seatsUsed} / {client.seatsAllowed}</div>
                <p className="mt-1 text-xs text-muted-foreground">Active HM occupants against reusable seats</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending approvals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{client.pendingCampaignApprovals}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {client.campaignApprovalMode === "require_approval" ? "Client approval required" : "Auto-approved"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Contract end</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatDate(client.activeContract?.endDate)}</div>
                <p className="mt-1 text-xs text-muted-foreground">Stored on the active contract</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card>
              <CardHeader>
                <CardTitle>Onboarding path</CardTitle>
                <CardDescription>What has to be true before the client can run their own workspace.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-3">
                  <FlowStep
                    complete={Boolean(client.activeContract)}
                    title="Contract"
                    detail={client.activeContract ? `${client.activeContract.seatCount} HM seats` : "Create a contract"}
                  />
                  <FlowStep
                    complete={client.clientInviteStatus === "available" || client.hasClientContact}
                    title="Client invite"
                    detail={client.hasClientContact ? "Used" : client.clientInviteStatus === "available" ? "Pending signup" : "No active invite"}
                  />
                  <FlowStep
                    complete={client.hasClientContact}
                    title="Client contact"
                    detail={client.hasClientContact ? "Active user linked" : "Waiting for registration"}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Seat ownership</CardTitle>
                <CardDescription>Admin controls capacity. The client controls who occupies each HM seat.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-sm text-muted-foreground">Occupied seats</span>
                  <span className="text-sm font-semibold">{client.seatsUsed}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-sm text-muted-foreground">Reusable capacity</span>
                  <span className="text-sm font-semibold">{client.seatsAllowed}</span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="text-sm text-muted-foreground">Available seats</span>
                  <span className="text-sm font-semibold">{Math.max(0, client.seatsAllowed - client.seatsUsed)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Client Details</CardTitle>
              <CardDescription>Live organisation, contact, and workflow data from Strapi.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Detail label="Legal name" value={client.legalName} />
              <Detail label="Primary contact" value={client.primaryContactName} />
              <Detail label="Address" value={client.address} />
              <Detail label="Time zone" value={client.timeZone} />
              <Detail label="Onboarding" value={client.onboardingCompleted ? "Completed" : "Not completed"} />
              <Detail label="Last updated" value={formatDate(client.updatedAt)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contract" className="mt-6">
          <Card>
            <CardHeader className="gap-4 md:flex md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle>Contract</CardTitle>
                <CardDescription>Seat allocation and contract dates.</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/upgrade-requests?client=${encodeURIComponent(client.id)}`}>
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Review entitlements
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Detail label="Status" value={client.activeContract?.status ?? "No active contract"} />
              <Detail label="Start date" value={formatDate(client.activeContract?.startDate)} />
              <Detail label="End date" value={formatDate(client.activeContract?.endDate)} />
              <Detail label="Seats" value={String(client.activeContract?.seatCount ?? 0)} />
              <div className="rounded-md border p-4 md:col-span-2 xl:col-span-4">
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="mt-2 text-sm">{client.activeContract?.notes || "No notes recorded"}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <div className="space-y-4">
            <SimpleList
              title="Client contacts"
              description="Client-side account contacts. Admin only issues or replaces the client signup invite."
              empty="No client contacts are attached to this client."
              rows={client.users
                .filter((user) => user.role === "Client Contact")
                .map((user) => ({
                  id: user.id,
                  primary: user.name,
                  secondary: user.email,
                  badge: user.status,
                }))}
            />
            <SimpleList
              title="Hiring-manager seat occupants"
              description="Current HM occupants are controlled by the client and count against contract capacity."
              empty="No active hiring-manager occupants are attached to this client."
              rows={client.users
                .filter((user) => user.role === "Hiring Manager" && user.status !== "Disabled")
                .map((user) => ({
                  id: user.id,
                  primary: user.name,
                  secondary: user.email,
                  badge: user.status,
                }))}
            />
            <SimpleList
              title="Previous hiring-manager records"
              description="Disabled HM users are retained as history and no longer occupy a seat."
              empty="No previous hiring-manager records are attached to this client."
              rows={client.users
                .filter((user) => user.role === "Hiring Manager" && user.status === "Disabled")
                .map((user) => ({
                  id: user.id,
                  primary: user.name,
                  secondary: user.email,
                  badge: "Previous",
                }))}
            />
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          <SimpleList
            title="Campaigns"
            description="Campaigns currently associated with this client."
            empty="No campaigns are attached to this client."
            rows={client.campaigns.map((campaign) => ({
              id: campaign.id,
              primary: campaign.title,
              secondary: `Created ${formatDate(campaign.createdAt)}`,
              badge: campaign.approvalStatus,
            }))}
          />
        </TabsContent>

        <TabsContent value="access" className="mt-6">
          <SimpleList
            title="Access Codes"
            description="Existing access code records. Plain codes are only shown when generated."
            empty="No access codes are attached to this client."
            rows={client.accessCodes.map((code) => ({
              id: code.id,
              primary: code.targetRole,
              secondary: `Expires ${formatDate(code.expiresAt)}`,
              badge: code.status,
            }))}
          />
        </TabsContent>

      </Tabs>
    </div>
  );
}

function ClientInviteAction({
  client,
  generatingCode,
  onGenerate,
}: {
  client: ClientDetails;
  generatingCode: boolean;
  onGenerate: () => void;
}) {
  if (client.hasClientContact) {
    return (
      <Badge variant="outline" className="h-10 gap-2 border-emerald-500/20 bg-emerald-500/10 px-3 text-emerald-600">
        <CheckCircle2 className="h-4 w-4" />
        Client contact active
      </Badge>
    );
  }

  if (client.clientInviteStatus === "available") {
    return (
      <Badge variant="outline" className="h-10 gap-2 border-blue-500/20 bg-blue-500/10 px-3 text-blue-600">
        <Clock3 className="h-4 w-4" />
        Client invite pending
      </Badge>
    );
  }

  return (
    <Button variant="outline" onClick={onGenerate} disabled={!client.canGenerateClientCode || generatingCode}>
      {generatingCode ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <KeyRound className="mr-2 h-4 w-4" />
      )}
      Generate client invite
    </Button>
  );
}

function FlowStep({
  complete,
  title,
  detail,
}: {
  complete: boolean;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        {complete ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        ) : (
          <Clock3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-sm font-medium">{value}</p>
    </div>
  );
}

function SimpleList({
  title,
  description,
  empty,
  rows,
}: {
  title: string;
  description: string;
  empty: string;
  rows: Array<{ id: string; primary: string; secondary: string; badge: string }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.primary}</p>
                <p className="truncate text-xs text-muted-foreground">{row.secondary}</p>
              </div>
              <Badge variant="outline" className={statusClass(row.badge)}>
                {row.badge}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
