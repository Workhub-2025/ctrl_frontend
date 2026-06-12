"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, ArrowUpRight, CheckCircle2, Loader2, Minus, Plus, Search, Users } from "lucide-react";

type EntitlementClient = {
  id: string;
  name: string;
  status: string;
  seatsUsed: number;
  seatsAllowed: number;
  primaryContact: string;
  features?: Record<string, boolean> | null;
  activeContract: {
    documentId: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    seatCount: number;
    notes: string;
  } | null;
};

const FEATURES = [
  { key: "deliveryRemote", label: "Remote delivery", group: "Delivery" },
  { key: "deliveryHybrid", label: "Hybrid delivery", group: "Delivery" },
  { key: "advancedPja", label: "Advanced PJA scoring", group: "Prioritisation" },
  { key: "extremePja", label: "Extreme PJA scoring", group: "Prioritisation" },
  { key: "typingIntermediate", label: "Intermediate typing", group: "Typing" },
  { key: "typingAdvanced", label: "Advanced typing", group: "Typing" },
] as const;

type DraftState = Record<string, { seatCount: string; features: Record<string, boolean>; notes: string }>;

export default function UpgradeRequestsPage() {
  const [clients, setClients] = useState<EntitlementClient[]>([]);
  const [drafts, setDrafts] = useState<DraftState>({});
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const loadEntitlements = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/upgrades", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Entitlements could not be loaded");
      const data = Array.isArray(body.data) ? (body.data as EntitlementClient[]) : [];
      setClients(data);
      setSelectedClientId((current) => current ?? data[0]?.id ?? null);
      setDrafts(
        Object.fromEntries(
          data.map((client) => [
            client.id,
            {
              seatCount: String(client.activeContract?.seatCount ?? client.seatsAllowed ?? 0),
              features: Object.fromEntries(
                FEATURES.map((feature) => [feature.key, client.features?.[feature.key] === true])
              ) as Record<string, boolean>,
              notes: client.activeContract?.notes ?? "",
            },
          ])
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Entitlements could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEntitlements();
  }, []);

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

    if (Number.isFinite(nextSeats) && nextSeats !== currentSeats) {
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

  const saveClient = async () => {
    if (!selectedClient || !selectedDraft) return;

    const seatCount = Number(selectedDraft.seatCount);
    if (!Number.isInteger(seatCount) || seatCount < 1) {
      setError("Seat count must be at least 1");
      return;
    }
    if (seatCount < selectedClient.seatsUsed) {
      setError(`Seat count cannot be lower than ${selectedClient.seatsUsed} active HM occupants`);
      return;
    }

    setSavingId(selectedClient.id);
    setError(null);
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
          },
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Entitlements could not be updated");
      setSavedMessage(`${selectedClient.name} entitlements approved`);
      await loadEntitlements();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Entitlements could not be updated");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-500/80">
            Upgrades
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Entitlement review</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Stage seat and feature changes, then approve them after a quick review.
          </p>
        </div>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/admin/clients">
            Client list
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      {savedMessage && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-600">
          {savedMessage}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
            <CardDescription>Select a client to stage entitlement changes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search clients"
                className="pl-9"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading clients...
              </div>
            )}

            <div className="max-h-[640px] space-y-2 overflow-y-auto pr-1">
              {!loading && filteredClients.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClientId(client.id)}
                  className={`w-full rounded-md border p-3 text-left transition-colors ${
                    selectedClient?.id === client.id
                      ? "border-cyan-500/40 bg-cyan-500/10"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{client.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{client.primaryContact}</p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {client.seatsUsed}/{client.seatsAllowed}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {!selectedClient || !selectedDraft ? (
          <Card>
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Select a client to review entitlements.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{selectedClient.name}</CardTitle>
                    <CardDescription>{selectedClient.primaryContact}</CardDescription>
                  </div>
                  <Badge variant="outline">{selectedClient.status}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <MiniStat label="Current HM seats" value={`${selectedClient.seatsUsed}/${selectedClient.seatsAllowed}`} />
                  <MiniStat label="Active features" value={activeFeatures.length} />
                  <MiniStat label="Contract" value={selectedClient.activeContract?.status ?? "None"} />
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor="hmSeatCount">HM seats</Label>
                    <div className="relative">
                      <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="hmSeatCount"
                        type="number"
                        min={Math.max(1, selectedClient.seatsUsed)}
                        className="pl-9"
                        value={selectedDraft.seatCount}
                        onChange={(event) => updateSeatDraft(selectedClient.id, event.target.value)}
                        disabled={!selectedClient.activeContract}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cannot go below {selectedClient.seatsUsed} active HM occupants.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="entitlementNotes">Review note</Label>
                    <Input
                      id="entitlementNotes"
                      value={selectedDraft.notes}
                      onChange={(event) => updateNotesDraft(selectedClient.id, event.target.value)}
                      placeholder="Approval reference, payment note, or commercial context"
                    />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <FeatureList
                    title="Available"
                    description="Not currently active for this client."
                    empty="All features are active."
                    features={availableFeatures}
                    actionLabel="Activate"
                    actionIcon="plus"
                    onAction={(featureKey) => setFeatureState(selectedClient.id, featureKey, true)}
                  />
                  <FeatureList
                    title="Active"
                    description="Enabled for this client."
                    empty="No optional features are active."
                    features={activeFeatures}
                    actionLabel="Remove"
                    actionIcon="minus"
                    onAction={(featureKey) => setFeatureState(selectedClient.id, featureKey, false)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>Final review</CardTitle>
                    <CardDescription>Approve these staged changes after a quick glance.</CardDescription>
                  </div>
                  <Badge variant="outline">{pendingChanges.length} change{pendingChanges.length === 1 ? "" : "s"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {pendingChanges.length === 0 ? (
                  <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No staged changes yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pendingChanges.map((change) => (
                      <div key={change} className="flex items-center gap-3 rounded-md border p-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-cyan-600" />
                        {change}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    onClick={saveClient}
                    disabled={pendingChanges.length === 0 || savingId === selectedClient.id || !selectedClient.activeContract}
                  >
                    {savingId === selectedClient.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Approve changes
                  </Button>
                </div>
              </CardContent>
            </Card>
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
    <div className="rounded-md border">
      <div className="border-b p-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-2 p-3">
        {features.length === 0 ? (
          <p className="p-2 text-sm text-muted-foreground">{empty}</p>
        ) : (
          features.map((feature) => (
            <div key={feature.key} className="flex items-center justify-between gap-3 rounded-md border bg-card p-3">
              <div>
                <p className="text-sm font-medium">{feature.label}</p>
                <p className="text-xs text-muted-foreground">{feature.group}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onAction(feature.key)} className="gap-2">
                {actionIcon === "plus" ? <Plus className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                {actionLabel}
                {actionIcon === "plus" && <ArrowRight className="h-3.5 w-3.5" />}
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
    <div className="rounded-md border bg-muted/20 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
