"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { invalidateAdminResource, useAdminResource } from "@/lib/admin-resource-cache";
import { PORTAL_CACHE_TTL_MS } from "@/lib/portal-fetch-cache";
import {
  AdminAlert,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
  AdminStatTile,
} from "@/components/admin/admin-portal-ui";
import {
  portalBadgeClass,
  portalLabelClass,
  portalPanelClass,
  portalAlertErrorClass,
  portalAlertInfoClass,
  portalInputClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

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

function statusClass(_status: string) {
  return portalBadgeClass;
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
    null,
    PORTAL_CACHE_TTL_MS,
    { allowEmpty: true }
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  const canDelete = useMemo(
    () => Boolean(client?.name && confirmName === client.name),
    [client?.name, confirmName]
  );
  const error = actionError || loadError;

  useEffect(() => {
    if (client?.primaryContactEmail) {
      setInviteEmail(client.primaryContactEmail);
    }
  }, [client?.primaryContactEmail]);

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

  const sendClientInvite = async () => {
    if (!client || !inviteEmail.trim()) return;
    setSendingInvite(true);
    setActionError(null);
    setInviteNotice(null);
    try {
      const response = await fetch(
        `/api/admin/clients/${encodeURIComponent(clientId)}/send-invite`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail.trim().toLowerCase() }),
        }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Client invite could not be sent");
      setInviteNotice(`Invite sent to ${inviteEmail.trim().toLowerCase()}`);
      mutateClient(
        client
          ? {
            ...client,
            clientInviteStatus: "available",
            clientInviteExpiresAt: body.data?.expiresAt ?? client.clientInviteExpiresAt,
            canGenerateClientCode: false,
          }
          : client
      );
      invalidateAdminResource("admin:clients");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Client invite could not be sent");
    } finally {
      setSendingInvite(false);
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

  if (loading) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" className="gap-2 px-0">
          <Link href="/admin/clients">
            <ArrowLeft className="h-4 w-4" />
            Back to clients
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">Loading client details…</p>
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
        <div className="rounded-md border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {loadError || "This client could not be found."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={client.name}
        description={`Legal name: ${client.legalName || "Not set"}`}
        notice={
          error ? (
            <AdminAlert>{error}</AdminAlert>
          ) : generatedCode ? (
            <AdminAlert tone="info">
              <p className="font-semibold">Client access code generated</p>
              <p className="mt-2 break-all font-mono text-base font-bold">{generatedCode.code}</p>
              <p className="mt-1 text-xs opacity-80">
                Expires {generatedCode.expiresAt ? new Date(generatedCode.expiresAt).toLocaleString("en-GB") : "soon"}.
                This code is shown once.
              </p>
            </AdminAlert>
          ) : inviteNotice ? (
            <AdminAlert tone="info">{inviteNotice}</AdminAlert>
          ) : null
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" className="h-9 rounded-lg">
              <Link href="/admin/clients">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All clients
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-9 rounded-lg">
              <Link href={`/admin/upgrade-requests?client=${encodeURIComponent(client.id)}`}>
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                Entitlements
              </Link>
            </Button>
            <ClientInviteAction
              client={client}
              inviteEmail={inviteEmail}
              onInviteEmailChange={setInviteEmail}
              generatingCode={generatingCode}
              sendingInvite={sendingInvite}
              onGenerate={generateClientCode}
              onSendInvite={sendClientInvite}
            />
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="h-9 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300">
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
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-none border-b border-white/5 bg-transparent p-0">
          {["summary", "contract", "users", "campaigns", "access"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-semibold capitalize text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              {tab === "access" ? "Access codes" : tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="summary" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <AdminStatTile
              label="Contract state"
              value={client.billingStatus}
              detail="Derived from the active contract"
            />
            <AdminStatTile
              label="Hiring manager seats"
              value={`${client.seatsUsed} / ${client.seatsAllowed}`}
              detail="Active HM occupants against reusable seats"
            />
            <AdminStatTile
              label="Pending approvals"
              value={client.pendingCampaignApprovals}
              detail={client.campaignApprovalMode === "require_approval" ? "Client approval required" : "Auto-approved"}
            />
            <AdminStatTile
              label="Contract end"
              value={formatDate(client.activeContract?.endDate)}
              detail="Stored on the active contract"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <AdminPanel>
              <AdminSectionHeader
                title="Onboarding path"
                description="What has to be true before the client can run their own workspace."
              />
              <div className="mt-4 grid gap-3 md:grid-cols-3">
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
            </AdminPanel>

            <AdminPanel>
              <AdminSectionHeader
                title="Seat ownership"
                description="Admin controls capacity. The client controls who occupies each HM seat."
              />
              <div className="mt-4 space-y-3">
                <div className={cn(portalPanelClass, "flex items-center justify-between p-3")}>
                  <span className={portalLabelClass}>Occupied seats</span>
                  <span className="text-sm font-bold text-foreground">{client.seatsUsed}</span>
                </div>
                <div className={cn(portalPanelClass, "flex items-center justify-between p-3")}>
                  <span className={portalLabelClass}>Reusable capacity</span>
                  <span className="text-sm font-bold text-foreground">{client.seatsAllowed}</span>
                </div>
                <div className={cn(portalPanelClass, "flex items-center justify-between p-3")}>
                  <span className={portalLabelClass}>Available seats</span>
                  <span className="text-sm font-bold text-foreground">{Math.max(0, client.seatsAllowed - client.seatsUsed)}</span>
                </div>
              </div>
            </AdminPanel>
          </div>

          <AdminPanel>
            <AdminSectionHeader
              title="Client details"
              description="Live organisation, contact, and workflow data from Strapi."
            />
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Detail label="Legal name" value={client.legalName} />
              <Detail label="Primary contact" value={client.primaryContactName} />
              <Detail label="Address" value={client.address} />
              <Detail label="Time zone" value={client.timeZone} />
              <Detail label="Onboarding" value={client.onboardingCompleted ? "Completed" : "Not completed"} />
              <Detail label="Last updated" value={formatDate(client.updatedAt)} />
            </div>
          </AdminPanel>
        </TabsContent>

        <TabsContent value="contract" className="mt-6">
          <AdminPanel>
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <AdminSectionHeader
                title="Contract"
                description="Seat allocation and contract dates."
              />
              <Button asChild variant="outline" size="sm" className="h-[34px] shrink-0">
                <Link href={`/admin/upgrade-requests?client=${encodeURIComponent(client.id)}`}>
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Review entitlements
                </Link>
              </Button>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Detail label="Status" value={client.activeContract?.status ?? "No active contract"} />
              <Detail label="Start date" value={formatDate(client.activeContract?.startDate)} />
              <Detail label="End date" value={formatDate(client.activeContract?.endDate)} />
              <Detail label="Seats" value={String(client.activeContract?.seatCount ?? 0)} />
              <div className={cn(portalPanelClass, "p-4 md:col-span-2 xl:col-span-4")}>
                <p className={portalLabelClass}>Notes</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{client.activeContract?.notes || "No notes recorded"}</p>
              </div>
            </div>
          </AdminPanel>
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
  inviteEmail,
  onInviteEmailChange,
  generatingCode,
  sendingInvite,
  onGenerate,
  onSendInvite,
}: {
  client: ClientDetails;
  inviteEmail: string;
  onInviteEmailChange: (value: string) => void;
  generatingCode: boolean;
  sendingInvite: boolean;
  onGenerate: () => void;
  onSendInvite: () => void;
}) {
  if (client.hasClientContact) {
    return (
      <Badge variant="outline" className={cn("h-10 gap-2 px-3", portalBadgeClass)}>
        <CheckCircle2 className="h-4 w-4" />
        Client contact active
      </Badge>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="min-w-[220px] space-y-1">
        <Label htmlFor="clientInviteEmail" className={portalLabelClass}>Client contact email</Label>
        <Input
          id="clientInviteEmail"
          type="email"
          value={inviteEmail}
          onChange={(event) => onInviteEmailChange(event.target.value)}
          placeholder="contact@organisation.gov.uk"
          className={cn(portalInputClass, "h-9")}
        />
      </div>
      <Button
        variant="outline"
        className="h-9"
        onClick={onSendInvite}
        disabled={sendingInvite || !inviteEmail.trim()}
      >
        {sendingInvite ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Mail className="mr-2 h-4 w-4" />
        )}
        Send invite
      </Button>
      {client.clientInviteStatus === "available" ? (
        <Badge variant="outline" className={cn("h-9 gap-2 px-3", portalBadgeClass)}>
          <Clock3 className="h-4 w-4" />
          Invite pending
        </Badge>
      ) : (
        <Button variant="outline" className="h-9" onClick={onGenerate} disabled={!client.canGenerateClientCode || generatingCode}>
          {generatingCode ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="mr-2 h-4 w-4" />
          )}
          Generate code only
        </Button>
      )}
    </div>
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
    <div className={cn(portalPanelClass, "p-4")}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-foreground">{title}</p>
        {complete ? (
          <CheckCircle2 className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
        ) : (
          <Clock3 className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{detail}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(portalPanelClass, "p-4")}>
      <p className={portalLabelClass}>{label}</p>
      <p className="mt-2 break-words text-sm font-bold text-foreground">{value}</p>
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
    <AdminPanel>
      <AdminSectionHeader title={title} description={description} />
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">{empty}</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className={cn(portalPanelClass, "flex items-center justify-between gap-4 p-3")}>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{row.primary}</p>
                <p className="truncate text-xs text-muted-foreground">{row.secondary}</p>
              </div>
              <Badge variant="outline" className={cn(statusClass(row.badge), "pointer-events-none rounded-md px-2 py-0.5 text-xs font-semibold")}>
                {row.badge}
              </Badge>
            </div>
          ))
        )}
      </div>
    </AdminPanel>
  );
}
