"use client";

import { useEffect, useState } from "react";
import { CreditCard, Loader2, Save, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { CLIENT_PLATFORM_FEATURES } from "@/lib/client/entitlements";
import { formatMoney } from "@/lib/money";

type Pricing = {
  currency?: string;
  basePlatformMonthlyPence?: number;
  seatMonthlyPence?: number;
  assessmentAddonPence?: number;
  versionUpgradePence?: number;
  featurePrices?: Record<string, number>;
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

export default function AdminBillingPage() {
  const [pricing, setPricing] = useState<Pricing>({
    currency: "gbp",
    basePlatformMonthlyPence: 0,
    seatMonthlyPence: 0,
    assessmentAddonPence: 0,
    versionUpgradePence: 0,
    featurePrices: {},
  });
  const [requests, setRequests] = useState<AdminUpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pricingRes, requestsRes] = await Promise.all([
        fetch("/api/admin/billing/pricing"),
        fetch("/api/admin/billing/upgrade-requests"),
      ]);
      const pricingBody = await pricingRes.json();
      const requestsBody = await requestsRes.json();
      if (!pricingRes.ok) throw new Error(pricingBody.error ?? "Pricing could not be loaded");
      if (!requestsRes.ok) throw new Error(requestsBody.error ?? "Requests could not be loaded");
      setPricing({
        currency: String(pricingBody.data?.currency ?? "gbp"),
        basePlatformMonthlyPence: Number(pricingBody.data?.basePlatformMonthlyPence ?? 0),
        seatMonthlyPence: Number(pricingBody.data?.seatMonthlyPence ?? 0),
        assessmentAddonPence: Number(pricingBody.data?.assessmentAddonPence ?? 0),
        versionUpgradePence: Number(pricingBody.data?.versionUpgradePence ?? 0),
        featurePrices: (pricingBody.data?.featurePrices as Record<string, number>) ?? {},
      });
      setRequests(requestsBody.data ?? []);
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
      setMessage("Pricing saved");
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
      setMessage(`Invoice created for ${body.data?.checkoutSessionId ?? ticketId}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invoice could not be sent");
    } finally {
      setSendingId(null);
    }
  };

  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Billing"
        title="Stripe billing & pricing"
        description="Configure upgrade prices and send Stripe checkout invoices. Entitlements unlock automatically after payment."
        icon={CreditCard}
        notice={
          error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          ) : message ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400">
              {message}
            </div>
          ) : null
        }
      />

      <Tabs defaultValue="pricing">
        <TabsList>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="requests">Client upgrade invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Base platform (monthly, pence)"
              value={String(pricing.basePlatformMonthlyPence ?? 0)}
              onChange={(value) =>
                setPricing((current) => ({
                  ...current,
                  basePlatformMonthlyPence: Number(value) || 0,
                }))
              }
              hint={formatMoney(pricing.basePlatformMonthlyPence ?? 0, pricing.currency)}
            />
            <Field
              label="Extra HM seat (monthly, pence)"
              value={String(pricing.seatMonthlyPence ?? 0)}
              onChange={(value) =>
                setPricing((current) => ({ ...current, seatMonthlyPence: Number(value) || 0 }))
              }
              hint={formatMoney(pricing.seatMonthlyPence ?? 0, pricing.currency)}
            />
            <Field
              label="Add-on assessment (pence)"
              value={String(pricing.assessmentAddonPence ?? 0)}
              onChange={(value) =>
                setPricing((current) => ({
                  ...current,
                  assessmentAddonPence: Number(value) || 0,
                }))
              }
            />
            <Field
              label="Version upgrade (pence)"
              value={String(pricing.versionUpgradePence ?? 0)}
              onChange={(value) =>
                setPricing((current) => ({
                  ...current,
                  versionUpgradePence: Number(value) || 0,
                }))
              }
            />
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">Optional feature add-ons</p>
            <div className="grid gap-3 md:grid-cols-2">
              {CLIENT_PLATFORM_FEATURES.map((feature) => (
                <Field
                  key={feature.key}
                  label={`${feature.label} (pence)`}
                  value={String(pricing.featurePrices?.[feature.key] ?? 0)}
                  onChange={(value) =>
                    setPricing((current) => ({
                      ...current,
                      featurePrices: {
                        ...(current.featurePrices ?? {}),
                        [feature.key]: Number(value) || 0,
                      },
                    }))
                  }
                />
              ))}
            </div>
          </div>

          <Button onClick={() => void savePricing()} disabled={saving} className="rounded-xl gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save pricing
          </Button>
        </TabsContent>

        <TabsContent value="requests" className="mt-6 space-y-4">
          {loading ? <p className="text-sm text-muted-foreground">Loading upgrade requests…</p> : null}
          {!loading && requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No client upgrade requests yet.</p>
          ) : null}
          {requests.map((request) => (
            <div
              key={request.id}
              className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/30 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{request.upgradeType.replace(/_/g, " ")}</Badge>
                  <Badge variant="outline">{request.billingStatus ?? "none"}</Badge>
                </div>
                <p className="font-mono text-xs text-primary">{request.ticketNumber}</p>
                <p className="text-sm font-semibold">{request.subject}</p>
              </div>
              <Button
                size="sm"
                className="rounded-xl gap-2"
                disabled={sendingId === request.id || request.billingStatus === "paid"}
                onClick={() => void sendInvoice(request.id)}
              >
                {sendingId === request.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Stripe invoice
              </Button>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl" />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
