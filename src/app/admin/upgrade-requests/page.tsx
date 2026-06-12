"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowUpRight, Loader2, Search, Users } from "lucide-react";

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

const FEATURE_GROUPS = [
  {
    title: "Delivery modes",
    features: [
      ["deliveryRemote", "Remote delivery"],
      ["deliveryHybrid", "Hybrid delivery"],
    ],
  },
  {
    title: "PJA scoring",
    features: [
      ["advancedPja", "Advanced scoring"],
      ["extremePja", "Extreme scoring"],
    ],
  },
  {
    title: "Typing difficulty",
    features: [
      ["typingIntermediate", "Intermediate typing"],
      ["typingAdvanced", "Advanced typing"],
    ],
  },
] as const;

type DraftState = Record<string, { seatCount: string; features: Record<string, boolean>; notes: string }>;

export default function UpgradeRequestsPage() {
  const [clients, setClients] = useState<EntitlementClient[]>([]);
  const [drafts, setDrafts] = useState<DraftState>({});
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
      setDrafts(
        Object.fromEntries(
          data.map((client) => [
            client.id,
            {
              seatCount: String(client.activeContract?.seatCount ?? client.seatsAllowed ?? 0),
              features: {
                deliveryRemote: client.features?.deliveryRemote === true,
                deliveryHybrid: client.features?.deliveryHybrid === true,
                advancedPja: client.features?.advancedPja === true,
                extremePja: client.features?.extremePja === true,
                typingIntermediate: client.features?.typingIntermediate === true,
                typingAdvanced: client.features?.typingAdvanced === true,
              },
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

  const toggleFeature = (clientId: string, feature: string) => {
    setDrafts((current) => ({
      ...current,
      [clientId]: {
        ...current[clientId],
        features: {
          ...current[clientId]?.features,
          [feature]: current[clientId]?.features?.[feature] !== true,
        },
      },
    }));
  };

  const saveClient = async (client: EntitlementClient) => {
    const draft = drafts[client.id];
    if (!draft) return;

    const seatCount = Number(draft.seatCount);
    if (!Number.isInteger(seatCount) || seatCount < 1) {
      setError("Seat count must be at least 1");
      return;
    }
    if (seatCount < client.seatsUsed) {
      setError(`Seat count cannot be lower than ${client.seatsUsed} active HM occupants`);
      return;
    }

    setSavingId(client.id);
    setError(null);
    setSavedMessage(null);
    try {
      const response = await fetch("/api/admin/upgrades", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientDocumentId: client.id,
          features: draft.features,
          contract: {
            seatCount,
            notes: draft.notes,
          },
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Entitlements could not be updated");
      setSavedMessage(`${client.name} entitlements updated`);
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
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Client entitlements</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Adjust live HM seat capacity and feature access for client contracts.
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

      <div className="relative max-w-sm">
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
          Loading entitlements...
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {!loading && filteredClients.map((client) => {
          const draft = drafts[client.id];
          const activeFeatures = Object.values(draft?.features ?? {}).filter(Boolean).length;

          return (
            <Card key={client.id}>
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{client.name}</CardTitle>
                    <CardDescription>{client.primaryContact}</CardDescription>
                  </div>
                  <Badge variant="outline">{client.status}</Badge>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniStat label="Active HM seats" value={`${client.seatsUsed}/${client.seatsAllowed}`} />
                  <MiniStat label="Enabled features" value={activeFeatures} />
                  <MiniStat label="Contract" value={client.activeContract?.status ?? "None"} />
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
                  <div className="space-y-2">
                    <Label htmlFor={`seats-${client.id}`}>HM seats</Label>
                    <div className="relative">
                      <Users className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id={`seats-${client.id}`}
                        type="number"
                        min={Math.max(1, client.seatsUsed)}
                        className="pl-9"
                        value={draft?.seatCount ?? ""}
                        onChange={(event) => updateSeatDraft(client.id, event.target.value)}
                        disabled={!client.activeContract}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`notes-${client.id}`}>Entitlement notes</Label>
                    <Input
                      id={`notes-${client.id}`}
                      value={draft?.notes ?? ""}
                      onChange={(event) => updateNotesDraft(client.id, event.target.value)}
                      placeholder="Commercial note, approval reference, or context"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {FEATURE_GROUPS.map((group) => (
                    <div key={group.title} className="rounded-md border p-3">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">{group.title}</p>
                      <div className="mt-3 space-y-3">
                        {group.features.map(([key, label]) => (
                          <div key={key} className="flex items-center justify-between gap-3">
                            <Label className="text-sm font-medium">{label}</Label>
                            <Switch
                              checked={draft?.features?.[key] === true}
                              onCheckedChange={() => toggleFeature(client.id, key)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => saveClient(client)} disabled={savingId === client.id || !client.activeContract}>
                    {savingId === client.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save entitlements
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!loading && filteredClients.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No clients match the current search.
          </CardContent>
        </Card>
      )}
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
