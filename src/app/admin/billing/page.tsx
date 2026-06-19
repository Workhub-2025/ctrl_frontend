"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Loader2,
  RefreshCw,
  RotateCw,
  Save,
  Send,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AdminAlert,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
  AdminStatTile,
} from "@/components/admin/admin-portal-ui";
import {
  PortalEmptyState,
  portalBadgeClass,
  portalInputClass,
} from "@/components/dashboard/portal/portal-ui";
import {
  portalIconWrapLgClass,
  portalLabelClass,
} from "@/components/dashboard/portal/portal-design-tokens";
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
  featurePrices: Record<string, number>;
  grandfatherOfferExpiresAt: string | null;
  defaultGrandfatherDiscountPercent: number;
  contractTypePrices: Record<ContractTier, ContractTierPricing>;
};

type ContractTier = "essential" | "professional" | "founder";

type ContractTierPricing = {
  label: string;
  basePlatformYearlyPence: number;
  includedSeatCount: number;
  deliveryRemoteIncluded: boolean;
  deliveryHybridIncluded: boolean;
  futurePaidFeaturesIncludedDuringFirstYear: boolean;
  discountPercent: number;
};

const CONTRACT_TIER_ORDER: ContractTier[] = [
  "essential",
  "professional",
  "founder",
];

const DEFAULT_CONTRACT_TYPE_PRICES: Record<ContractTier, ContractTierPricing> = {
  essential: {
    label: "Essential",
    basePlatformYearlyPence: 0,
    includedSeatCount: 1,
    deliveryRemoteIncluded: false,
    deliveryHybridIncluded: false,
    futurePaidFeaturesIncludedDuringFirstYear: false,
    discountPercent: 0,
  },
  professional: {
    label: "Professional",
    basePlatformYearlyPence: 0,
    includedSeatCount: 3,
    deliveryRemoteIncluded: true,
    deliveryHybridIncluded: true,
    futurePaidFeaturesIncludedDuringFirstYear: false,
    discountPercent: 0,
  },
  founder: {
    label: "Founder",
    basePlatformYearlyPence: 0,
    includedSeatCount: 3,
    deliveryRemoteIncluded: true,
    deliveryHybridIncluded: true,
    futurePaidFeaturesIncludedDuringFirstYear: false,
    discountPercent: 33,
  },
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
    billingRequestDocumentId: string;
    billingStatus: string;
    amountDuePence: number | null;
    currency: string;
  } | null;
};

function expiryDetailClass(days: number | null) {
  if (days === null) return "text-muted-foreground";
  if (days <= 30) return "font-medium text-foreground";
  return "text-muted-foreground";
}

function normalizeContractTypePrices(raw: unknown): Record<ContractTier, ContractTierPricing> {
  const source = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Partial<Record<ContractTier, Partial<ContractTierPricing>>>)
    : {};

  return CONTRACT_TIER_ORDER.reduce((acc, tier) => {
    const defaults = DEFAULT_CONTRACT_TYPE_PRICES[tier];
    const value = source[tier] ?? {};
    acc[tier] = {
      label: String(value.label ?? defaults.label),
      basePlatformYearlyPence:
        Number(value.basePlatformYearlyPence ?? defaults.basePlatformYearlyPence) || 0,
      includedSeatCount: Number(value.includedSeatCount ?? defaults.includedSeatCount) || 0,
      deliveryRemoteIncluded:
        typeof value.deliveryRemoteIncluded === "boolean"
          ? value.deliveryRemoteIncluded
          : defaults.deliveryRemoteIncluded,
      deliveryHybridIncluded:
        typeof value.deliveryHybridIncluded === "boolean"
          ? value.deliveryHybridIncluded
          : defaults.deliveryHybridIncluded,
      futurePaidFeaturesIncludedDuringFirstYear:
        typeof value.futurePaidFeaturesIncludedDuringFirstYear === "boolean"
          ? value.futurePaidFeaturesIncludedDuringFirstYear
          : defaults.futurePaidFeaturesIncludedDuringFirstYear,
      discountPercent: Number(value.discountPercent ?? defaults.discountPercent) || 0,
    };
    return acc;
  }, {} as Record<ContractTier, ContractTierPricing>);
}

export default function AdminBillingPage() {
  const [pricing, setPricing] = useState<PricingForm>({
    currency: "gbp",
    basePlatformYearlyPence: 0,
    seatOneOffPence: 0,
    assessmentAddonPence: 0,
    featurePrices: {},
    grandfatherOfferExpiresAt: null,
    defaultGrandfatherDiscountPercent: 33,
    contractTypePrices: DEFAULT_CONTRACT_TYPE_PRICES,
  });
  const [expiring, setExpiring] = useState<ExpiringContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [resendingRenewalId, setResendingRenewalId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async (force = false) => {
    if (!force) setLoading(true);
    setError(null);
    try {
      const [pricing, expiringContracts] = await Promise.all([
        fetchPortalJson({
          key: "admin:billing:pricing",
          url: "/api/admin/billing/pricing",
          fallback: {
            currency: "gbp",
            basePlatformYearlyPence: 0,
            seatOneOffPence: 0,
            assessmentAddonPence: 0,
            featurePrices: {},
            grandfatherOfferExpiresAt: null,
            defaultGrandfatherDiscountPercent: 33,
            contractTypePrices: DEFAULT_CONTRACT_TYPE_PRICES,
          },
          force,
          allowEmpty: true,
          transform: (body) => {
            const data = (body as { data?: Record<string, unknown> }).data ?? {};
            const contractTypePrices = normalizeContractTypePrices(data.contractTypePrices);
            return {
              currency: String(data.currency ?? "gbp"),
              basePlatformYearlyPence: Number(
                data.basePlatformYearlyPence ?? data.basePlatformMonthlyPence ?? 0
              ),
              seatOneOffPence: Number(data.seatOneOffPence ?? data.seatMonthlyPence ?? 0),
              assessmentAddonPence: Number(data.assessmentAddonPence ?? 0),
              featurePrices: (data.featurePrices as Record<string, number>) ?? {},
              grandfatherOfferExpiresAt: data.grandfatherOfferExpiresAt
                ? String(data.grandfatherOfferExpiresAt)
                : null,
              defaultGrandfatherDiscountPercent:
                Number(data.defaultGrandfatherDiscountPercent ?? 33) || 33,
              contractTypePrices,
            };
          },
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
        featurePrices: pricing.featurePrices,
        grandfatherOfferExpiresAt: pricing.grandfatherOfferExpiresAt,
        defaultGrandfatherDiscountPercent: pricing.defaultGrandfatherDiscountPercent,
        contractTypePrices: pricing.contractTypePrices,
      });
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

  const updateContractPrice = (
    tier: ContractTier,
    key: keyof ContractTierPricing,
    value: string | number | boolean
  ) => {
    setPricing((current) => ({
      ...current,
      contractTypePrices: {
        ...current.contractTypePrices,
        [tier]: {
          ...current.contractTypePrices[tier],
          [key]: value,
        },
      },
    }));
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
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Renewal invoice could not be sent");
    } finally {
      setRenewingId(null);
    }
  };

  const resendRenewalLink = async (billingRequestDocumentId: string) => {
    setResendingRenewalId(billingRequestDocumentId);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/admin/billing/resend-invoice/${encodeURIComponent(billingRequestDocumentId)}`,
        { method: "POST" }
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Renewal payment link could not be resent");
      setMessage("Renewal payment link regenerated — client can use Pay now again.");
      invalidatePortalCache("admin:billing:expiring-contracts");
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Renewal payment link could not be resent");
    } finally {
      setResendingRenewalId(null);
    }
  };

  const urgentRenewals = useMemo(
    () => expiring.filter((row) => (row.daysUntilExpiry ?? 999) <= 30),
    [expiring]
  );

  return (
    <div className="space-y-8 pb-6">
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

      <div className="grid gap-3 sm:grid-cols-2">
        <AdminStatTile
          label="Professional annual fee"
          value={formatMoney(
            pricing.contractTypePrices.professional.basePlatformYearlyPence,
            pricing.currency
          )}
          detail="Default annual contract charge"
          icon={CalendarClock}
        />
        <AdminStatTile
          label="Contracts expiring (90d)"
          value={String(expiring.length)}
          detail={urgentRenewals.length > 0 ? `${urgentRenewals.length} within 30 days` : "No urgent renewals"}
          icon={TrendingUp}
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
        </TabsList>

        <TabsContent value="pricing" className="space-y-6">
          <AdminPanel className="space-y-6">
            <div className="flex items-start gap-3 border-b border-border/50 pb-4 dark:border-white/6">
              <span className={portalIconWrapLgClass}>
                <CalendarClock className="h-5 w-5" aria-hidden="true" />
              </span>
              <AdminSectionHeader
                className="flex-1 sm:items-start"
                title="Contract pricing"
                description="Set the annual charge attached to each contract type."
              />
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {CONTRACT_TIER_ORDER.map((tier) => {
                const tierPricing = pricing.contractTypePrices[tier];
                return (
                  <div
                    key={tier}
                    className="space-y-4 rounded-lg border border-border/60 bg-background/45 p-4 dark:border-white/8"
                  >
                    <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
                      <div className="space-y-2">
                        <Label className={portalLabelClass}>Contract label</Label>
                        <Input
                          value={tierPricing.label}
                          onChange={(event) => updateContractPrice(tier, "label", event.target.value)}
                          className={cn(portalInputClass, "h-10")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className={portalLabelClass}>Included seats</Label>
                        <Input
                          type="number"
                          min={1}
                          value={tierPricing.includedSeatCount}
                          onChange={(event) =>
                            updateContractPrice(
                              tier,
                              "includedSeatCount",
                              Number(event.target.value) || DEFAULT_CONTRACT_TYPE_PRICES[tier].includedSeatCount
                            )
                          }
                          className={cn(portalInputClass, "h-10")}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-1">
                        <PoundField
                          label="Annual contract"
                          pence={tierPricing.basePlatformYearlyPence}
                          onChangePence={(value) =>
                            updateContractPrice(tier, "basePlatformYearlyPence", value)
                          }
                          compact
                        />
                        <p className="text-[11px] text-muted-foreground pl-1">
                          Equivalent monthly fee: {formatMoney(Math.round(tierPricing.basePlatformYearlyPence / 12), pricing.currency)}/month
                        </p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={tierPricing.deliveryRemoteIncluded}
                          onChange={(event) =>
                            updateContractPrice(tier, "deliveryRemoteIncluded", event.target.checked)
                          }
                        />
                        Remote included
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={tierPricing.deliveryHybridIncluded}
                          onChange={(event) =>
                            updateContractPrice(tier, "deliveryHybridIncluded", event.target.checked)
                          }
                        />
                        Hybrid included
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={tierPricing.futurePaidFeaturesIncludedDuringFirstYear}
                          onChange={(event) =>
                            updateContractPrice(
                              tier,
                              "futurePaidFeaturesIncludedDuringFirstYear",
                              event.target.checked
                            )
                          }
                        />
                        First-year paid features
                      </label>
                    </div>
                    <div className="max-w-40 space-y-2">
                      <Label className={portalLabelClass}>Discount %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={tierPricing.discountPercent}
                        onChange={(event) =>
                          updateContractPrice(tier, "discountPercent", Number(event.target.value) || 0)
                        }
                        className={cn(portalInputClass, "h-10")}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </AdminPanel>

          <AdminPanel className="space-y-5">
            <AdminSectionHeader
              title="Founder availability"
              description="Controls whether the public pricing page can show the Founder contract option."
            />
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className={portalLabelClass}>Offer expiry date</Label>
                <Input
                  type="date"
                  value={pricing.grandfatherOfferExpiresAt ?? ""}
                  onChange={(event) =>
                    setPricing((current) => ({
                      ...current,
                      grandfatherOfferExpiresAt: event.target.value || null,
                    }))
                  }
                  className={cn(portalInputClass, "h-10")}
                />
              </div>
              <div className="space-y-2">
                <Label className={portalLabelClass}>Default founder discount %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={pricing.defaultGrandfatherDiscountPercent}
                  onChange={(event) =>
                    setPricing((current) => ({
                      ...current,
                      defaultGrandfatherDiscountPercent: Number(event.target.value) || 0,
                    }))
                  }
                  className={cn(portalInputClass, "h-10")}
                />
              </div>
            </div>
          </AdminPanel>

          <AdminPanel className="space-y-6">
            <div className="flex items-start gap-3 border-b border-border/50 pb-4 dark:border-white/6">
              <span className={portalIconWrapLgClass}>
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <AdminSectionHeader
                className="flex-1 sm:items-start"
                title="Standard upgrade pricing"
                description="Global standard charges for platform seat increases and new assessments."
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <PoundField
                label="Extra HM seat (monthly recurring cost)"
                pence={pricing.seatOneOffPence}
                onChangePence={(value) =>
                  setPricing((current) => ({ ...current, seatOneOffPence: value }))
                }
                icon={Users}
              />
              <PoundField
                label="Add-on assessment (one-off cost)"
                pence={pricing.assessmentAddonPence}
                onChangePence={(value) =>
                  setPricing((current) => ({ ...current, assessmentAddonPence: value }))
                }
              />
            </div>
          </AdminPanel>

          <AdminPanel className="space-y-5">
            <AdminSectionHeader
              title="Optional feature add-ons"
              description="One-off unlock fees for premium delivery and scoring features."
            />
            <div className="grid gap-4 md:grid-cols-2">
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
            </div>
          </AdminPanel>

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
            <PortalEmptyState
              icon={CalendarClock}
              title="No upcoming renewals"
              description="No contracts are expiring in the next 90 days."
            />
          ) : (
            expiring.map((row) => (
              <AdminPanel key={row.contractDocumentId} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{row.clientName}</p>
                      <Badge variant="outline" className={cn(portalBadgeClass, "rounded-full text-[10px]")}>
                        {row.seatCount} seats
                      </Badge>
                      {row.pendingRenewal?.billingStatus === "invoice_sent" ? (
                        <BillingBadge status="invoice_sent" />
                      ) : null}
                      {row.pendingRenewal?.billingStatus === "paid" ? (
                        <BillingBadge status="paid" />
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Ends{" "}
                      <span className="font-medium text-foreground">
                        {formatDisplayDate(row.endDate)}
                      </span>
                      {row.daysUntilExpiry !== null ? (
                        <span className={cn("ml-2", expiryDetailClass(row.daysUntilExpiry))}>
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
                  {row.pendingRenewal?.billingStatus === "invoice_sent" &&
                  row.pendingRenewal.billingRequestDocumentId ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl gap-2 shrink-0"
                      disabled={
                        resendingRenewalId === row.pendingRenewal.billingRequestDocumentId
                      }
                      onClick={() =>
                        void resendRenewalLink(row.pendingRenewal!.billingRequestDocumentId)
                      }
                    >
                      {resendingRenewalId === row.pendingRenewal.billingRequestDocumentId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RotateCw className="h-4 w-4" />
                      )}
                      Resend link
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="rounded-xl gap-2 shrink-0"
                      disabled={
                        !row.clientDocumentId ||
                        renewingId === row.clientDocumentId ||
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
                  )}
              </AdminPanel>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
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
      <Label className={cn(portalLabelClass, compact && "normal-case tracking-normal text-xs")}>
        {label}
      </Label>
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
          className={cn(portalInputClass, "rounded-xl pl-8", Icon && "pr-10", compact && "h-9 text-sm")}
        />
      </div>
      {!compact && pence > 0 ? (
        <p className="text-xs text-muted-foreground">Stored as {formatMoney(pence)}</p>
      ) : null}
    </div>
  );
}

function BillingBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn(portalBadgeClass, "rounded-full capitalize")}>
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
