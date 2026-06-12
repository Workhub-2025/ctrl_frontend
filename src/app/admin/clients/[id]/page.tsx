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
  Globe,
  Keyboard,
  BrainCircuit,
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
import { Switch } from "@/components/ui/switch";

type ClientDetails = {
  id: string;
  name: string;
  legalName: string;
  status: string;
  plan: string;
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
  features?: Record<string, any> | null;
  createdAt: string | null;
  updatedAt: string | null;
  pendingCampaignApprovals: number;
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
      return "border-blue-500/20 bg-blue-500/10 text-blue-600";
    case "paused":
    case "rejected":
      return "border-orange-500/20 bg-orange-500/10 text-orange-600";
    case "expired":
    case "disabled":
      return "border-red-500/20 bg-red-500/10 text-red-600";
    default:
      return "border-muted-foreground/20 text-muted-foreground";
  }
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const clientId = params.id;
  const [activeTab, setActiveTab] = useState("summary");
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [features, setFeatures] = useState<Record<string, boolean>>({});
  const [savingFeatures, setSavingFeatures] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const canDelete = useMemo(
    () => Boolean(client?.name && confirmName === client.name),
    [client?.name, confirmName]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/clients/${encodeURIComponent(clientId)}`, { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Client could not be loaded");
        return body.data as ClientDetails;
      })
      .then((data) => {
        if (!cancelled) {
          setClient(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Client could not be loaded");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    if (client) {
      setFeatures({
        extremePja: client.features?.extremePja === true,
        advancedPja: client.features?.advancedPja === true,
        typingIntermediate: client.features?.typingIntermediate === true,
        typingAdvanced: client.features?.typingAdvanced === true,
        deliveryRemote: client.features?.deliveryRemote === true,
        deliveryHybrid: client.features?.deliveryHybrid === true,
      });
    }
  }, [client]);

  const toggleFeature = (key: string) => {
    setFeatures((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const saveFeatures = async () => {
    setSavingFeatures(true);
    setSavedMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/admin/clients/${encodeURIComponent(clientId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          features: {
            extremePja: features.extremePja,
            advancedPja: features.advancedPja,
            typingIntermediate: features.typingIntermediate,
            typingAdvanced: features.typingAdvanced,
            deliveryRemote: features.deliveryRemote,
            deliveryHybrid: features.deliveryHybrid,
          },
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Features could not be updated");
      setClient((prev) => prev ? { ...prev, features: body.data?.features ?? body.data?.data?.features ?? features } : null);
      setSavedMessage("Client features updated successfully");
      setTimeout(() => setSavedMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Features could not be updated");
    } finally {
      setSavingFeatures(false);
    }
  };

  const generateClientCode = async () => {
    setGeneratingCode(true);
    setError(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Client access code could not be generated");
    } finally {
      setGeneratingCode(false);
    }
  };

  const deleteClient = async () => {
    if (!client || !canDelete) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/clients/${encodeURIComponent(client.id)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Client could not be deleted");
      router.push("/admin/clients");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Client could not be deleted");
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
          <Button variant="outline" onClick={generateClientCode} disabled={generatingCode}>
            {generatingCode ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            Generate Client Code
          </Button>
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
          {["summary", "contract", "users", "campaigns", "access", "features"].map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="rounded-none border-b-2 border-transparent px-3 py-3 capitalize data-[state=active]:border-cyan-500 data-[state=active]:shadow-none"
            >
              {tab === "access" ? "Access Codes" : tab === "features" ? "Features" : tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="summary" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Current plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{client.plan}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Renews {formatDate(client.activeContract?.endDate)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Hiring manager seats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{client.seatsUsed} / {client.seatsAllowed}</div>
                <p className="mt-1 text-xs text-muted-foreground">Active users against contract seats</p>
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
                <CardTitle className="text-sm font-medium text-muted-foreground">Billing status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{client.billingStatus}</div>
                <p className="mt-1 text-xs text-muted-foreground">Based on active contract state</p>
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
            <CardHeader>
              <CardTitle>Contract</CardTitle>
              <CardDescription>Seat allocation and contract dates.</CardDescription>
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
          <SimpleList
            title="Users"
            description="Client contacts and hiring managers attached to this client."
            empty="No users are attached to this client."
            rows={client.users.map((user) => ({
              id: user.id,
              primary: user.name,
              secondary: user.email,
              badge: user.role,
            }))}
          />
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

        <TabsContent value="features" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Management</CardTitle>
              <CardDescription>
                Configure advanced features and assessment permissions for this client.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {savedMessage && (
                <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600">
                  {savedMessage}
                </div>
              )}
              
              <div className="space-y-6">
                {/* Section 1: Campaign Delivery Modes */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <Globe className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Campaign Delivery Modes</h3>
                  </div>
                  <div className="space-y-4 divide-y divide-border/40">
                    <div className="flex items-center justify-between py-2.5">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Remote Delivery Mode</Label>
                        <p className="text-xs text-muted-foreground max-w-xl">
                          Allows campaigns to use the Remote delivery mode lock. Disabled by default.
                        </p>
                      </div>
                      <Switch
                        checked={features.deliveryRemote ?? false}
                        onCheckedChange={() => toggleFeature("deliveryRemote")}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2.5">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Hybrid Delivery Mode</Label>
                        <p className="text-xs text-muted-foreground max-w-xl">
                          Allows campaigns to use the Hybrid delivery mode option. Disabled by default.
                        </p>
                      </div>
                      <Switch
                        checked={features.deliveryHybrid ?? false}
                        onCheckedChange={() => toggleFeature("deliveryHybrid")}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: PJA Scoring Modes */}
                <div className="space-y-3 pt-4">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prioritisation (PJA) Scoring Modes</h3>
                  </div>
                  <div className="space-y-4 divide-y divide-border/40">
                    <div className="flex items-center justify-between py-2.5">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">PJA Extreme Scoring Mode</Label>
                        <p className="text-xs text-muted-foreground max-w-xl">
                          Allows campaigns to use the Extreme scoring model (rank distance multipliers with critical misprioritisation penalties). Disabled by default.
                        </p>
                      </div>
                      <Switch
                        checked={features.extremePja ?? false}
                        onCheckedChange={() => toggleFeature("extremePja")}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2.5">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">PJA Advanced Scoring Mode</Label>
                        <p className="text-xs text-muted-foreground max-w-xl">
                          Allows campaigns to use the Advanced scoring model (pure rank distance multipliers). Disabled by default.
                        </p>
                      </div>
                      <Switch
                        checked={features.advancedPja ?? false}
                        onCheckedChange={() => toggleFeature("advancedPja")}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Typing Test Difficulties */}
                <div className="space-y-3 pt-4">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <Keyboard className="h-4 w-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Typing Test Difficulty Settings</h3>
                  </div>
                  <div className="space-y-4 divide-y divide-border/40">
                    <div className="flex items-center justify-between py-2.5">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Typing Intermediate Difficulty</Label>
                        <p className="text-xs text-muted-foreground max-w-xl">
                          Allows campaigns to select the Intermediate typing difficulty level. Disabled by default.
                        </p>
                      </div>
                      <Switch
                        checked={features.typingIntermediate ?? false}
                        onCheckedChange={() => toggleFeature("typingIntermediate")}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2.5">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-semibold">Typing Advanced Difficulty</Label>
                        <p className="text-xs text-muted-foreground max-w-xl">
                          Allows campaigns to select the Advanced typing difficulty level. Disabled by default.
                        </p>
                      </div>
                      <Switch
                        checked={features.typingAdvanced ?? false}
                        onCheckedChange={() => toggleFeature("typingAdvanced")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={saveFeatures} disabled={savingFeatures}>
                  {savingFeatures && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Feature Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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
