"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpRight, CheckCircle2, Loader2, Minus, Plus, Search, Users } from "lucide-react";
import { invalidateAdminResource, useAdminResource } from "@/lib/admin-resource-cache";
import { PORTAL_CACHE_TTL_MS } from "@/lib/portal-fetch-cache";
import { cn } from "@/lib/utils";
import {
  AdminAlert,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/admin-portal-ui";
import {
  portalAlertErrorClass,
  portalAlertInfoClass,
  portalBadgeClass,
  portalInputClass,
  portalPanelClass,
  portalPanelNestedClass,
} from "@/components/dashboard/portal/portal-design-tokens";

type EntitlementClient = {
  id: string;
  name: string;
  status: string;
  seatsUsed: number;
  seatsAllowed: number;
  primaryContact: string;
  features?: Record<string, any> | null;
  activeContract: {
    documentId: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    seatCount: number;
    notes: string;
  } | null;
};

type ContractStatus = "active" | "soft_locked" | "pending_deletion";

const CONTRACT_STATUS_OPTIONS: Array<{ value: ContractStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "soft_locked", label: "Soft locked" },
  { value: "pending_deletion", label: "Pending deletion" },
];

const FEATURES = [
  { key: "deliveryRemote", label: "Remote delivery", group: "Delivery" },
  { key: "deliveryHybrid", label: "Hybrid delivery", group: "Delivery" },
  { key: "assessmentRecovery", label: "Assessment recovery audit", group: "Recovery" },
] as const;

type DraftState = Record<
  string,
  { seatCount: string; features: Record<string, any>; notes: string; status: ContractStatus }
>;

function normalizeContractStatus(status?: string | null): ContractStatus {
  if (CONTRACT_STATUS_OPTIONS.some((option) => option.value === status)) {
    return status as ContractStatus;
  }
  return "active";
}

function initialSeatCount(client: EntitlementClient) {
  return String(Math.max(1, client.activeContract?.seatCount ?? client.seatsAllowed, client.seatsUsed));
}

function seatSummary(client: EntitlementClient) {
  if (!client.activeContract) {
    return `${client.seatsUsed} active / no allocation`;
  }
  return `${client.seatsUsed}/${client.seatsAllowed}`;
}

export default function UpgradeRequestsPage() {
  const searchParams = useSearchParams();
  const requestedClientId = searchParams.get("client");
  const [drafts, setDrafts] = useState<DraftState>({});
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const {
    data: clients,
    error: loadError,
    loading,
    refetch: refetchEntitlements,
  } = useAdminResource<EntitlementClient[]>(
    "admin:upgrades",
    "/api/admin/upgrades",
    []
  );

  const error = actionError || loadError;

  useEffect(() => {
    setSelectedClientId((current) => {
      if (requestedClientId && clients.some((client) => client.id === requestedClientId)) {
        return requestedClientId;
      }
      return current ?? clients[0]?.id ?? null;
    });
    setDrafts(
      Object.fromEntries(
        clients.map((client) => [
          client.id,
          {
            seatCount: initialSeatCount(client),
            features: {
              ...(client.features ?? {}),
              ...Object.fromEntries(
                FEATURES.map((feature) => [feature.key, client.features?.[feature.key] === true])
              ),
            },
            notes: client.activeContract?.notes ?? "",
            status: normalizeContractStatus(client.activeContract?.status),
          },
        ])
      )
    );
  }, [clients, requestedClientId]);

  const filteredClients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) =>
      [client.name, client.primaryContact, client.status].join(" ").toLowerCase().includes(query)
    );
  }, [clients, searchTerm]);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? filteredClients[0] ?? null,
    [clients, filteredClients, selectedClientId]
  );

  const selectedDraft = selectedClient ? drafts[selectedClient.id] : null;

  const activeFeatures = useMemo(
    () => FEATURES.filter((feature) => selectedDraft?.features?.[feature.key] === true),
    [selectedDraft]
  );

  const availableFeatures = useMemo(
    () => FEATURES.filter((feature) => selectedDraft?.features?.[feature.key] !== true),
    [selectedDraft]
  );

  const pendingChanges = useMemo(() => {
    if (!selectedClient || !selectedDraft) return [];

    const changes: string[] = [];
    const nextSeats = Number(selectedDraft.seatCount);
    const currentSeats = selectedClient.activeContract?.seatCount ?? selectedClient.seatsAllowed;

    if (!selectedClient.activeContract && Number.isFinite(nextSeats)) {
      changes.push(`Create active contract with ${nextSeats} HM seats`);
    } else if (Number.isFinite(nextSeats) && nextSeats !== currentSeats) {
      changes.push(`HM seats: ${currentSeats} -> ${nextSeats}`);
    }

    for (const feature of FEATURES) {
      const before = selectedClient.features?.[feature.key] === true;
      const after = selectedDraft.features?.[feature.key] === true;
      if (before !== after) {
        changes.push(`${after ? "Activate" : "Deactivate"} ${feature.label}`);
      }
    }

    if ((selectedDraft.notes ?? "") !== (selectedClient.activeContract?.notes ?? "")) {
      changes.push("Update entitlement notes");
    }

    const currentStatus = normalizeContractStatus(selectedClient.activeContract?.status);
    if (selectedClient.activeContract && selectedDraft.status !== currentStatus) {
      const label =
        CONTRACT_STATUS_OPTIONS.find((option) => option.value === selectedDraft.status)?.label ??
        selectedDraft.status;
      changes.push(`Contract status: ${currentStatus.replace(/_/g, " ")} -> ${label}`);
    }

    return changes;
  }, [selectedClient, selectedDraft]);

  const setFeatureState = (clientId: string, featureKey: string, enabled: boolean) => {
    setDrafts((current) => ({
      ...current,
      [clientId]: {
        ...current[clientId],
        features: {
          ...current[clientId]?.features,
          [featureKey]: enabled,
        },
      },
    }));
  };

  const updateSeatDraft = (clientId: string, seatCount: string) => {
    setDrafts((current) => ({
      ...current,
      [clientId]: {
        ...current[clientId],
        seatCount,
      },
    }));
  };

  const updateNotesDraft = (clientId: string, notes: string) => {
    setDrafts((current) => ({
      ...current,
      [clientId]: {
        ...current[clientId],
        notes,
      },
    }));
  };

  const updateStatusDraft = (clientId: string, status: ContractStatus) => {
    setDrafts((current) => ({
      ...current,
      [clientId]: {
        ...current[clientId],
        status,
      },
    }));
  };

  const stageCurrentSetup = (client: EntitlementClient) => {
    setDrafts((current) => ({
      ...current,
      [client.id]: {
        ...current[client.id],
        seatCount: initialSeatCount(client),
        status: normalizeContractStatus(current[client.id]?.status),
        notes: current[client.id]?.notes ||
          `Generated from current client setup: ${client.seatsUsed} active HM occupant${client.seatsUsed === 1 ? "" : "s"}.`,
      },
    }));
  };

  const saveClient = async () => {
    if (!selectedClient || !selectedDraft) return;

    const seatCount = Number(selectedDraft.seatCount);
    if (!Number.isInteger(seatCount) || seatCount < 1) {
      setActionError("Seat count must be at least 1");
      return;
    }
    if (seatCount < selectedClient.seatsUsed) {
      setActionError(`Seat count cannot be lower than ${selectedClient.seatsUsed} active HM occupants`);
      return;
    }

    setSavingId(selectedClient.id);
    setActionError(null);
    setSavedMessage(null);
    try {
      const response = await fetch("/api/admin/upgrades", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientDocumentId: selectedClient.id,
          features: selectedDraft.features,
          contract: {
            seatCount,
            notes: selectedDraft.notes,
            status: selectedDraft.status,
          },
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Entitlements could not be updated");
      setSavedMessage(`${selectedClient.name} entitlements approved`);
      invalidateAdminResource("admin:overview");
      invalidateAdminResource("admin:clients");
      await refetchEntitlements();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Entitlements could not be updated");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Entitlements"
        description="Adjust hiring-manager seats and feature entitlements for each client."
        action={
          <Button asChild variant="outline" className="rounded-lg gap-2">
            <Link href="/admin/clients">
              All clients
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </Button>
        }
      />

      {error && (
        <div className={portalAlertErrorClass}>{error}</div>
      )}
      {savedMessage && (
        <div className={portalAlertInfoClass}>{savedMessage}</div>
      )}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <AdminPanel padding={false} className="overflow-hidden">
          <div className="border-b border-border/50 bg-muted/20 p-4 dark:border-white/6 dark:bg-black/10">
            <h2 className="text-base font-bold font-display text-foreground">Clients</h2>
            <p className="text-xs text-muted-foreground">Select a client to stage changes.</p>
          </div>
          <div className="space-y-4 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients"
                className="pl-9 rounded-xl border-border/70 dark:border-white/10 focus-visible:ring-primary"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                Loading clients...
              </div>
            )}

            <div className="max-h-[640px] space-y-2.5 overflow-y-auto pr-1">
              {!loading && filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClientId(client.id)}
                  className={`w-full rounded-xl border p-3.5 text-left transition-all duration-200 ${
                    selectedClient?.id === client.id
                      ? "bg-primary/10 border-primary/20 text-primary shadow-sm"
                      : "border-border/60 dark:border-white/5 text-muted-foreground hover:bg-slate-100/50 dark:hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{client.name}</p>
                      <p className="truncate text-xs text-muted-foreground/85 mt-0.5">{client.primaryContact}</p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 rounded-lg text-[10px] px-2 py-0.5 ${selectedClient?.id === client.id ? "border-primary/30 text-primary bg-primary/5" : "text-muted-foreground"}`}>
                      {seatSummary(client)}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </AdminPanel>

        {!selectedClient || !selectedDraft ? (
          <AdminPanel className="flex items-center justify-center p-12">
            <p className="text-sm text-muted-foreground">Select a client to review entitlements.</p>
          </AdminPanel>
        ) : (
          <div className="space-y-4">
            <AdminPanel padding={false} className="overflow-hidden">
              <div className="space-y-3 border-b border-border/40 bg-muted/20 p-6 dark:border-white/5 dark:bg-black/10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold font-display text-foreground">{selectedClient.name}</h2>
                    <p className="text-xs text-muted-foreground">{selectedClient.primaryContact}</p>
                  </div>
                  <Badge variant="outline" className={cn("rounded-lg px-2 py-0.5 font-semibold", portalBadgeClass)}>{selectedClient.status}</Badge>
                </div>
                <div className="grid gap-3 grid-cols-3 pt-1">
                  <MiniStat label="Current HM seats" value={seatSummary(selectedClient)} />
                  <MiniStat label="Active features" value={activeFeatures.length} />
                  <MiniStat label="Contract" value={selectedClient.activeContract?.status ?? "None"} />
                </div>
                {!selectedClient.activeContract && (
                  <div className={cn(portalAlertInfoClass, "mt-2 p-4 text-xs")}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <p className="text-muted-foreground/90 leading-relaxed">
                        No active contract is attached. Generate a draft allocation from the current active HM seats.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => stageCurrentSetup(selectedClient)}
                        className="rounded-lg text-xs font-semibold shrink-0"
                      >
                        Use current setup
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-6 p-6">
                <div className="grid gap-4 lg:grid-cols-[200px_220px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="hmSeatCount" className="text-xs font-bold text-slate-400 uppercase tracking-wider">HM seats</Label>
                    <div className="relative">
                      <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="hmSeatCount"
                        type="number"
                        min={Math.max(1, selectedClient.seatsUsed)}
                        className="pl-9 rounded-xl border-border/70 dark:border-white/10 focus-visible:ring-primary"
                        value={selectedDraft.seatCount}
                        onChange={(event) => updateSeatDraft(selectedClient.id, event.target.value)}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground/80">
                      Cannot go below {selectedClient.seatsUsed} active occupants.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contractStatus" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contract status</Label>
                    <Select
                      value={selectedDraft.status}
                      onValueChange={(value) => updateStatusDraft(selectedClient.id, value as ContractStatus)}
                      disabled={!selectedClient.activeContract}
                    >
                      <SelectTrigger id="contractStatus" className="rounded-xl border-border/70 dark:border-white/10 focus:ring-primary">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTRACT_STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground/80">
                      {selectedClient.activeContract ? "Updates the selected contract record." : "Available after a contract exists."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entitlementNotes" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Review note</Label>
                    <Input
                      id="entitlementNotes"
                      value={selectedDraft.notes}
                      onChange={(event) => updateNotesDraft(selectedClient.id, event.target.value)}
                      placeholder="Approval reference, payment note, or commercial context"
                      className="rounded-xl border-border/70 dark:border-white/10 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2 pt-2">
                  <FeatureList
                    title="Available Features"
                    description="Not currently active for this client."
                    empty="All features are active."
                    features={availableFeatures}
                    actionLabel="Activate"
                    actionIcon="plus"
                    onAction={(featureKey) => setFeatureState(selectedClient.id, featureKey, true)}
                  />
                  <FeatureList
                    title="Active Features"
                    description="Enabled for this client."
                    empty="No optional features are active."
                    features={activeFeatures}
                    actionLabel="Remove"
                    actionIcon="minus"
                    onAction={(featureKey) => setFeatureState(selectedClient.id, featureKey, false)}
                  />
                </div>
              </div>
            </AdminPanel>

            <AdminPanel padding={false} className="overflow-hidden">
              <div className="border-b border-border/40 bg-muted/20 p-6 dark:border-white/5 dark:bg-black/10">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold font-display text-foreground">Final review</h2>
                    <p className="text-xs text-muted-foreground">Approve staged entitlement overrides.</p>
                  </div>
                  <Badge variant="outline" className={cn("rounded-lg px-2.5 py-0.5 font-semibold", portalBadgeClass)}>{pendingChanges.length} change{pendingChanges.length === 1 ? "" : "s"}</Badge>
                </div>
              </div>
              <div className="space-y-4 p-6">
                {pendingChanges.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/60 p-5 text-center text-xs text-muted-foreground/75 bg-slate-100/5 dark:bg-black/5">
                    No staged changes yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {pendingChanges.map((change) => (
                      <div key={change} className={cn(portalPanelClass, "flex items-center gap-3 p-4 text-xs font-medium text-foreground")}>
                        <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-primary" />
                        <span>{change}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={saveClient} 
                    disabled={pendingChanges.length === 0 || savingId === selectedClient.id}
                    className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-md shadow-primary/20 rounded-xl px-5 flex items-center gap-2 font-semibold h-10"
                  >
                    {savingId === selectedClient.id && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                    Approve changes
                  </Button>
                </div>
              </div>
            </AdminPanel>
          </div>
        )}
      </div>
    </div>
  );
}

function FeatureList({
  title,
  description,
  empty,
  features,
  actionLabel,
  actionIcon,
  onAction,
}: {
  title: string;
  description: string;
  empty: string;
  features: Array<(typeof FEATURES)[number]>;
  actionLabel: string;
  actionIcon: "plus" | "minus";
  onAction: (featureKey: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border/60 dark:border-white/5 overflow-hidden bg-slate-100/5 dark:bg-black/5">
      <div className="border-b border-border/40 dark:border-white/5 p-4 bg-slate-100/20 dark:bg-black/10">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground/80">{description}</p>
      </div>
      <div className="space-y-2 p-4">
        {features.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground/75 italic">{empty}</p>
        ) : (
          features.map((feature) => (
            <div key={feature.key} className={cn(portalPanelNestedClass, "flex items-center justify-between gap-3 p-3.5")}>
              <div>
                <p className="text-sm font-semibold text-foreground">{feature.label}</p>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">{feature.group}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onAction(feature.key)} className="rounded-lg h-8 gap-1.5 text-xs font-semibold">
                {actionIcon === "plus" ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                {actionLabel}
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/60 dark:border-white/5 bg-slate-100/30 dark:bg-black/10 p-3.5 transition-all duration-300 hover:scale-[1.01]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1.5 text-lg font-extrabold text-foreground font-display">{value}</p>
    </div>
  );
}
