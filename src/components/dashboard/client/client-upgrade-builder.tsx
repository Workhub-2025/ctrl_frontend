"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  Send,
  Users,
} from "lucide-react";
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
import {
  PortalSectionHeader,
} from "@/components/dashboard/portal/portal-ui";
import {
  portalBadgeClass,
  portalPanelClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import {
  CLIENT_DELIVERY_FEATURES,
  type ClientDeliveryFeatureKey,
  type ClientUpgradeRequestPayload,
} from "@/lib/client/entitlements";
import {
  buildUpgradeBundleItems,
  computeLineItems,
  computePendingChanges,
  createEmptyUpgradeDraft,
  sumLineItems,
  type ClientUpgradeDraft,
  type ClientUpgradePricing,
} from "@/lib/client/upgrade-bundle";
import { formatMoney } from "@/lib/money";
import type { ClientEntitlements } from "@/hooks/use-client-portal";
import { cn } from "@/lib/utils";

function getActiveDeliveryFeatures(entitlements: ClientEntitlements | null) {
  const fromDelivery = entitlements?.deliveryFeatures ?? {};
  const fromPlatform = entitlements?.platformFeatures ?? {};
  return {
    deliveryRemote: fromDelivery.deliveryRemote === true || fromPlatform.deliveryRemote === true,
    deliveryHybrid: fromDelivery.deliveryHybrid === true || fromPlatform.deliveryHybrid === true,
  } satisfies Record<ClientDeliveryFeatureKey, boolean>;
}

export function ClientUpgradeBuilder({
  entitlements,
  canRequestUpgrades,
  submitting,
  onSubmit,
}: {
  entitlements: ClientEntitlements | null;
  canRequestUpgrades: boolean;
  submitting: boolean;
  onSubmit: (payload: ClientUpgradeRequestPayload) => Promise<void>;
}) {
  const currentSeats = entitlements?.contract?.seatCount ?? 0;
  const activeDeliveryFeatures = getActiveDeliveryFeatures(entitlements);
  const requestableDeliveryFeatures = useMemo(
    () => CLIENT_DELIVERY_FEATURES.filter((feature) => !activeDeliveryFeatures[feature.key]),
    [activeDeliveryFeatures]
  );
  const showDeliverySection = requestableDeliveryFeatures.length > 0;
  const requestableAssessments = entitlements?.requestableAssessments ?? [];

  const [draft, setDraft] = useState<ClientUpgradeDraft>(() => createEmptyUpgradeDraft(currentSeats));
  const [pricing, setPricing] = useState<ClientUpgradePricing | null>(null);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(createEmptyUpgradeDraft(currentSeats));
  }, [currentSeats, entitlements?.client?.documentId]);

  useEffect(() => {
    let cancelled = false;
    const loadPricing = async () => {
      setPricingLoading(true);
      try {
        const response = await fetch("/api/client/billing/pricing", { cache: "no-store" });
        const body = await response.json().catch(() => ({}));
        if (!cancelled && response.ok) {
          setPricing((body.data ?? null) as ClientUpgradePricing | null);
        }
      } catch {
        if (!cancelled) setPricing(null);
      } finally {
        if (!cancelled) setPricingLoading(false);
      }
    };
    void loadPricing();
    return () => {
      cancelled = true;
    };
  }, []);

  const pendingChanges = useMemo(
    () =>
      computePendingChanges({
        draft,
        currentSeats,
        activeDeliveryFeatures,
        assessments: [],
      }),
    [draft, currentSeats, activeDeliveryFeatures]
  );

  const bundleItems = useMemo(
    () =>
      buildUpgradeBundleItems({
        draft,
        currentSeats,
        activeDeliveryFeatures,
        assessments: [],
      }),
    [draft, currentSeats, activeDeliveryFeatures]
  );

  const discountPercent = entitlements?.contract?.grandfatherDiscountPercent ?? undefined;

  const isGrandfatherActive = useMemo(() => {
    if (!entitlements?.contract || entitlements.contract.tier !== "grandfather") return false;
    const today = new Date().toISOString().split("T")[0];
    const start = entitlements.contract.grandfatherStartedAt;
    const end = entitlements.contract.grandfatherEndsAt;
    if (!start || !end) return false;
    return today >= start && today <= end;
  }, [entitlements?.contract]);

  const lineItems = useMemo(
    () => (pricing ? computeLineItems(bundleItems, pricing, discountPercent, isGrandfatherActive) : []),
    [bundleItems, pricing, discountPercent, isGrandfatherActive]
  );

  const estimatedTotal = useMemo(() => sumLineItems(lineItems), [lineItems]);

  const updateDraft = (patch: Partial<ClientUpgradeDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const toggleDeliveryFeature = (featureKey: ClientDeliveryFeatureKey) => {
    if (activeDeliveryFeatures[featureKey]) return;
    setDraft((current) => ({
      ...current,
      deliveryFeatures: {
        ...current.deliveryFeatures,
        [featureKey]: !current.deliveryFeatures[featureKey],
      },
    }));
  };

  const toggleQueuedAssessment = () => {
    if (draft.queuedAddonAssessment) {
      updateDraft({ queuedAddonAssessment: null });
      return;
    }

    const slug = draft.selectedAddonSlug;
    if (!slug) return;

    const match = requestableAssessments.find((assessment) => assessment.slug === slug);
    if (!match) return;

    updateDraft({
      queuedAddonAssessment: { slug: match.slug, label: match.title },
    });
  };

  const handleSubmit = async () => {
    setFieldError(null);

    if (bundleItems.length === 0) {
      setFieldError("Add at least one change to your upgrade request.");
      return;
    }

    try {
      await onSubmit({
        type: "upgrade_bundle",
        items: buildUpgradeBundleItems({
          draft,
          currentSeats,
          activeDeliveryFeatures,
          assessments: [],
        }),
        lineItems: lineItems.length > 0 ? lineItems : undefined,
      });
      setDraft(createEmptyUpgradeDraft(currentSeats));
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : "Request could not be submitted");
    }
  };

  return (
    <div className="space-y-5">
      <PortalSectionHeader
        eyebrow="Request an upgrade"
        title="Build your upgrade"
        description={
          canRequestUpgrades
            ? "Stage seats, delivery methods, and add-ons in one billing request."
            : "Upgrade requests will be available once your organisation has a contract on file."
        }
      />

      {!canRequestUpgrades ? (
        <p className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground dark:border-white/5">
          Contact CTRL support if you need help setting up your initial contract.
        </p>
      ) : null}

      <div className={cn("space-y-5", !canRequestUpgrades && "pointer-events-none opacity-60")}>
        <div className={cn("grid gap-4", showDeliverySection ? "md:grid-cols-2" : "md:grid-cols-1")}>
          <section className={cn(portalPanelClass, "space-y-3 p-4")}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-4 w-4" aria-hidden="true" />
              Hiring manager seats
            </div>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-xl"
                disabled={draft.requestedSeats <= Math.max(currentSeats, 1)}
                onClick={() =>
                  updateDraft({ requestedSeats: Math.max(currentSeats, draft.requestedSeats - 1) })
                }
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={Math.max(currentSeats, 1)}
                value={draft.requestedSeats}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  updateDraft({
                    requestedSeats: Number.isFinite(next)
                      ? Math.max(currentSeats, next)
                      : Math.max(currentSeats, 1),
                  });
                }}
                className="rounded-xl text-center"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9 rounded-xl"
                onClick={() => updateDraft({ requestedSeats: draft.requestedSeats + 1 })}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Current allocation: {currentSeats} seat{currentSeats === 1 ? "" : "s"}
              {draft.requestedSeats <= currentSeats ? " · no seat change staged" : ""}
            </p>
          </section>

          {showDeliverySection ? (
            <section className={cn(portalPanelClass, "space-y-3 p-4")}>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Users className="h-4 w-4" aria-hidden="true" />
                Delivery methods
              </div>
              <ul className="space-y-2">
                {requestableDeliveryFeatures.map((feature) => {
                  const queued = draft.deliveryFeatures[feature.key];
                  return (
                    <li key={feature.key} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{feature.label}</p>
                        <p className="text-xs text-muted-foreground">{feature.group}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant={queued ? "default" : "outline"}
                        className="rounded-xl"
                        onClick={() => toggleDeliveryFeature(feature.key)}
                      >
                        {queued ? "Queued" : "Add"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>

        {requestableAssessments.length > 0 ? (
          <section className={cn(portalPanelClass, "space-y-3 p-4")}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
              Add-on assessment
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Label>Add-on assessment</Label>
                <Select
                  value={draft.selectedAddonSlug ?? "none"}
                  onValueChange={(value) => {
                    updateDraft({
                      selectedAddonSlug: value === "none" ? null : value,
                      queuedAddonAssessment: null,
                    });
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select assessment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select assessment</SelectItem>
                    {requestableAssessments.map((assessment) => (
                      <SelectItem key={assessment.slug} value={assessment.slug}>
                        {assessment.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                size="sm"
                variant={draft.queuedAddonAssessment ? "default" : "outline"}
                className="rounded-xl sm:mb-0.5"
                disabled={!draft.selectedAddonSlug && !draft.queuedAddonAssessment}
                onClick={toggleQueuedAssessment}
              >
                {draft.queuedAddonAssessment ? "Queued" : "Add"}
              </Button>
            </div>
          </section>
        ) : null}

        <section className={cn(portalPanelClass, "space-y-4 p-4")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Pending changes</p>
              <p className="text-xs text-muted-foreground">Review before submitting one billing request.</p>
            </div>
            <Badge variant="outline" className={cn("rounded-lg text-[10px] font-semibold", portalBadgeClass)}>
              {pendingChanges.length} change{pendingChanges.length === 1 ? "" : "s"}
            </Badge>
          </div>

          {pendingChanges.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
              No changes staged yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {pendingChanges.map((change) => (
                <li
                  key={change}
                  className={cn(portalPanelClass, "flex items-center gap-3 px-3 py-2 text-xs font-medium text-foreground")}
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  {change}
                </li>
              ))}
            </ul>
          )}

          {lineItems.length > 0 ? (
            <div className="space-y-2 border-t border-border/50 pt-4 dark:border-white/5">
              {isGrandfatherActive && (
                <div className="mb-3 rounded-lg bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                  Active Grandfather Plan: Platform upgrades are included at £0.
                </div>
              )}
              {discountPercent && !isGrandfatherActive && (
                <div className="mb-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-500 dark:bg-emerald-500/20">
                  Loyalty Benefit: {discountPercent}% discount applied to all upgrades.
                </div>
              )}
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Estimated cost
              </p>
              <ul className="space-y-2">
                {lineItems.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {item.label} × {item.quantity}
                    </span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(item.quantity * item.unitAmountPence, pricing?.currency ?? "gbp")}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3 text-sm font-semibold dark:border-white/5">
                <span>Total</span>
                <span>{formatMoney(estimatedTotal, pricing?.currency ?? "gbp")}</span>
              </div>
            </div>
          ) : pricingLoading ? (
            <p className="text-xs text-muted-foreground">Loading indicative pricing…</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Final pricing will appear on your invoice after CTRL review.
            </p>
          )}

          {fieldError ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {fieldError}
            </p>
          ) : null}

          <Button
            type="button"
            disabled={!canRequestUpgrades || submitting || pendingChanges.length === 0}
            className="h-11 w-full rounded-xl font-semibold"
            onClick={() => void handleSubmit()}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                Submitting request…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                Submit upgrade request
              </>
            )}
          </Button>
        </section>
      </div>
    </div>
  );
}
