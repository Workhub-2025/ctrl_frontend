"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CreditCard,
  Loader2,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminAlert, AdminPageHeader } from "@/components/admin/admin-portal-ui";
import { CLIENT_PLATFORM_FEATURES } from "@/lib/client/entitlements";
import {
  formatMoney,
  formatPoundsInput,
  parsePoundsInput,
} from "@/lib/money";
import {
  fetchPortalJson,
  invalidatePortalCache,
} from "@/lib/portal-fetch-cache";
import { cn } from "@/lib/utils";

type PricingForm = {
  currency: string;
  basePlatformYearlyPence: number;
  seatOneOffPence: number;
  assessmentAddonPence: number;
  versionUpgradePence: number;
  featurePrices: Record<string, number>;
};

type AdminUpgradeRequest = {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  upgradeType: string;
  billingStatus?: string;
  amountDuePence?: number | null;
  currency?: string;
};

type ExpiringContract = {
  contractDocumentId: string;
  clientDocumentId: string | null;
  clientName: string;
  seatCount: number;
  startDate: string;
  endDate: string;
  daysUntilExpiry: number | null;
  paymentStatus: string;
  pendingRenewal: {
    ticketDocumentId: string;
    billingStatus: string;
    amountDuePence: number | null;
    currency: string;
  } | null;
};

function expiryTone(days: number | null) {
  if (days === null) return "text-muted-foreground";
  if (days <= 14) return "text-red-500 dark:text-red-400";
  if (days <= 45) return "text-amber-600 dark:text-amber-300";
  return "text-emerald-600 dark:text-emerald-300";
}

export default function AdminBillingPage() {
  const [pricing, setPricing] = useState<PricingForm>({
    currency: "gbp",
    basePlatformYearlyPence: 0,
    seatOneOffPence: 0,
    assessmentAddonPence: 0,
    versionUpgradePence: 0,
    featurePrices: {},
  });
  const [requests, setRequests] = useState<AdminUpgradeRequest[]>([]);
  const [expiring, setExpiring] = useState<ExpiringContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const [pricing, requests, expiringContracts] = await Promise.all([
        fetchPortalJson({
          key: "admin:billing:pricing",
          url: "/api/admin/billing/pricing",
          fallback: {
            currency: "gbp",
            basePlatformYearlyPence: 0,
            seatOneOffPence: 0,
            assessmentAddonPence: 0,
            versionUpgradePence: 0,
            featurePrices: {},
          },
          force,
          allowEmpty: true,
          transform: (body) => {
            const data = (body as { data?: Record<string, unknown> }).data ?? {};
            return {
              currency: String(data.currency ?? "gbp"),
              basePlatformYearlyPence: Number(
                data.basePlatformYearlyPence ?? data.basePlatformMonthlyPence ?? 0
              ),
              seatOneOffPence: Number(data.seatOneOffPence ?? data.seatMonthlyPence ?? 0),
              assessmentAddonPence: Number(data.assessmentAddonPence ?? 0),
              versionUpgradePence: Number(data.versionUpgradePence ?? 0),
              featurePrices: (data.featurePrices as Record<string, number>) ?? {},
            };
          },
        }),
        fetchPortalJson<AdminUpgradeRequest[]>({
          key: "admin:billing:upgrade-requests",
          url: "/api/admin/billing/upgrade-requests",
          fallback: [],
          force,
          allowEmpty: true,
        }),
        fetchPortalJson<ExpiringContract[]>({
          key: "admin:billing:expiring-contracts",
          url: "/api/admin/billing/expiring-contracts?withinDays=90",
          fallback: [],
          force,
          allowEmpty: true,
        }),
      ]);

      setPricing({
        currency: pricing.currency,
        basePlatformYearlyPence: pricing.basePlatformYearlyPence,
        seatOneOffPence: pricing.seatOneOffPence,
        assessmentAddonPence: pricing.assessmentAddonPence,
        versionUpgradePence: pricing.versionUpgradePence,
        featurePrices: pricing.featurePrices,
      });
      setRequests(requests);
      setExpiring(expiringContracts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Billing data could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const savePricing = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/billing/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pricing),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Pricing could not be saved");
      setMessage("Pricing saved successfully.");
      invalidatePortalCache("admin:billing:pricing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pricing could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const sendInvoice = async (ticketId: string) => {
    setSendingId(ticketId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/billing/send-invoice/${encodeURIComponent(ticketId)}`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Invoice could not be sent");
      setMessage("Upgrade invoice sent to client.");
      invalidatePortalCache("admin:billing:upgrade-requests");
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invoice could not be sent");
    } finally {
      setSendingId(null);
    }
  };

  const sendRenewal = async (clientDocumentId: string) => {
    setRenewingId(clientDocumentId);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/billing/send-renewal/${encodeURIComponent(clientDocumentId)}`,
        { method: "POST" }
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Renewal invoice could not be sent");
      setMessage(
        body.data?.newEndDate
          ? `Renewal invoice sent — extends to ${body.data.newEndDate} after payment.`
          : "Renewal invoice sent to client."
      );
      invalidatePortalCache("admin:billing:expiring-contracts");
      invalidatePortalCache("admin:billing:upgrade-requests");
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Renewal invoice could not be sent");
    } finally {
      setRenewingId(null);
    }
  };

  const urgentRenewals = useMemo(
    () => expiring.filter((row) => (row.daysUntilExpiry ?? 999) <= 30),
    [expiring]
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-6">
      <AdminPageHeader
        title="Pricing & invoices"
        description="Set platform pricing, send renewal invoices, and manage upgrade checkout links via Stripe."
        notice={
          error ? (
            <AdminAlert>{error}</AdminAlert>
          ) : message ? (
            <AdminAlert tone="info">{message}</AdminAlert>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile
          label="Annual platform fee"
          value={formatMoney(pricing.basePlatformYearlyPence, pricing.currency)}
          hint="Charged once per contract year on renewal"
        />
        <SummaryTile
          label="Contracts expiring (90d)"
          value={String(expiring.length)}
          hint={urgentRenewals.length > 0 ? `${urgentRenewals.length} within 30 days` : "No urgent renewals"}
        />
        <SummaryTile
          label="Open upgrade requests"
          value={String(requests.filter((r) => r.billingStatus !== "paid").length)}
          hint="Seat, assessment, and version upgrades"
        />
      </div>

      <Tabs defaultValue="pricing" className="space-y-6">
        <TabsList className="h-auto flex-wrap gap-1 rounded-xl p-1">
          <TabsTrigger value="pricing" className="rounded-lg px-4">
            Pricing
          </TabsTrigger>
          <TabsTrigger value="renewals" className="rounded-lg px-4">
            Contract renewals
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-lg px-4">
            Upgrade invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-6">
          <Card className="rounded-2xl border-border/60 bg-background/40">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Annual platform fee</CardTitle>
                  <CardDescription>
                    Yearly contract charge — applied when admin sends a renewal invoice.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <PoundField
                label="Base platform (per contract year)"
                pence={pricing.basePlatformYearlyPence}
                onChangePence={(value) =>
                  setPricing((current) => ({ ...current, basePlatformYearlyPence: value }))
                }
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-background/40">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-300">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">One-off upgrade fees</CardTitle>
                  <CardDescription>
                    Single payments — not recurring. Charged when a client upgrade request is invoiced.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-5 pt-6 md:grid-cols-2">
              <PoundField
                label="Extra HM seat (one-off per seat)"
                pence={pricing.seatOneOffPence}
                onChangePence={(value) =>
                  setPricing((current) => ({ ...current, seatOneOffPence: value }))
                }
                icon={Users}
              />
              <PoundField
                label="Add-on assessment"
                pence={pricing.assessmentAddonPence}
                onChangePence={(value) =>
                  setPricing((current) => ({ ...current, assessmentAddonPence: value }))
                }
              />
              <PoundField
                label="Assessment version upgrade"
                pence={pricing.versionUpgradePence}
                onChangePence={(value) =>
                  setPricing((current) => ({ ...current, versionUpgradePence: value }))
                }
                icon={TrendingUp}
              />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border/60 bg-background/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Optional feature add-ons</CardTitle>
              <CardDescription>One-off unlock fees for premium delivery and scoring features.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              {CLIENT_PLATFORM_FEATURES.map((feature) => (
                <PoundField
                  key={feature.key}
                  label={feature.label}
                  pence={pricing.featurePrices?.[feature.key] ?? 0}
                  onChangePence={(value) =>
                    setPricing((current) => ({
                      ...current,
                      featurePrices: { ...(current.featurePrices ?? {}), [feature.key]: value },
                    }))
                  }
                  compact
                />
              ))}
            </CardContent>
          </Card>

          <Button onClick={() => void savePricing()} disabled={saving} className="rounded-xl gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save all pricing
          </Button>
        </TabsContent>

        <TabsContent value="renewals" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Active contracts ending within the next 90 days. Send a renewal invoice to extend by one
              year from the current end date.
            </p>
            <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => void load(true)}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading contracts…</p>
          ) : expiring.length === 0 ? (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No contracts are expiring in the next 90 days.
              </CardContent>
            </Card>
          ) : (
            expiring.map((row) => (
              <Card key={row.contractDocumentId} className="rounded-2xl border-border/60">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{row.clientName}</p>
                      <Badge variant="outline" className="rounded-full text-[10px]">
                        {row.seatCount} seats
                      </Badge>
                      {row.pendingRenewal?.billingStatus === "invoice_sent" ? (
                        <Badge className="rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                          Invoice sent
                        </Badge>
                      ) : null}
                      {row.pendingRenewal?.billingStatus === "paid" ? (
                        <Badge className="rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          Paid
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ends{" "}
                      <span className="font-medium text-foreground">
                        {formatDisplayDate(row.endDate)}
                      </span>
                      {row.daysUntilExpiry !== null ? (
                        <span className={cn("ml-2 font-semibold", expiryTone(row.daysUntilExpiry))}>
                          · {row.daysUntilExpiry} day{row.daysUntilExpiry === 1 ? "" : "s"} left
                        </span>
                      ) : null}
                    </p>
                    {row.pendingRenewal?.amountDuePence ? (
                      <p className="text-xs text-muted-foreground">
                        Renewal amount:{" "}
                        {formatMoney(
                          row.pendingRenewal.amountDuePence,
                          row.pendingRenewal.currency ?? "gbp"
                        )}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    className="rounded-xl gap-2 shrink-0"
                    disabled={
                      !row.clientDocumentId ||
                      renewingId === row.clientDocumentId ||
                      row.pendingRenewal?.billingStatus === "invoice_sent" ||
                      row.pendingRenewal?.billingStatus === "paid"
                    }
                    onClick={() =>
                      row.clientDocumentId ? void sendRenewal(row.clientDocumentId) : undefined
                    }
                  >
                    {renewingId === row.clientDocumentId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send renewal invoice
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading upgrade requests…</p>
          ) : requests.length === 0 ? (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No client upgrade requests yet.
              </CardContent>
            </Card>
          ) : (
            requests.map((request) => (
              <Card key={request.id} className="rounded-2xl border-border/60">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full capitalize">
                        {request.upgradeType.replace(/_/g, " ")}
                      </Badge>
                      <BillingBadge status={request.billingStatus ?? "none"} />
                    </div>
                    <p className="font-mono text-xs text-primary">{request.ticketNumber}</p>
                    <p className="text-sm font-semibold">{request.subject}</p>
                    {request.amountDuePence ? (
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(request.amountDuePence, request.currency ?? "gbp")}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    className="rounded-xl gap-2 shrink-0"
                    disabled={sendingId === request.id || request.billingStatus === "paid"}
                    onClick={() => void sendInvoice(request.id)}
                  >
                    {sendingId === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send invoice
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="rounded-2xl border-border/60 bg-background/30">
      <CardContent className="space-y-1 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-semibold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function PoundField({
  label,
  pence,
  onChangePence,
  icon: Icon,
  compact,
}: {
  label: string;
  pence: number;
  onChangePence: (pence: number) => void;
  icon?: typeof Users;
  compact?: boolean;
}) {
  const [display, setDisplay] = useState(formatPoundsInput(pence));

  useEffect(() => {
    setDisplay(formatPoundsInput(pence));
  }, [pence]);

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      <Label className={cn(compact && "text-xs")}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
          £
        </span>
        {Icon ? (
          <Icon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
        ) : null}
        <Input
          inputMode="decimal"
          value={display}
          onChange={(event) => setDisplay(event.target.value)}
          onBlur={() => onChangePence(parsePoundsInput(display))}
          className={cn("rounded-xl pl-8", Icon && "pr-10", compact && "h-9 text-sm")}
        />
      </div>
      {!compact && pence > 0 ? (
        <p className="text-xs text-muted-foreground">Stored as {formatMoney(pence)}</p>
      ) : null}
    </div>
  );
}

function BillingBadge({ status }: { status: string }) {
  const classes =
    status === "paid"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : status === "invoice_sent"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : "bg-muted text-muted-foreground";

  return (
    <Badge variant="outline" className={cn("rounded-full border-0 capitalize", classes)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function formatDisplayDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
