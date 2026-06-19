"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  Send,
  TrendingUp,
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
import { Textarea } from "@/components/ui/textarea";
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
  getCustomVersionPlaceholder,
  sumLineItems,
  type ClientEntitlementAssessment,
  type ClientUpgradeDraft,
  type ClientUpgradePricing,
} from "@/lib/client/upgrade-bundle";
import { CUSTOM_ASSESSMENT_VERSION } from "@/lib/client/entitlements";
import { formatMoney } from "@/lib/money";
import type { ClientEntitlements } from "@/hooks/use-client-portal";
import { cn } from "@/lib/utils";

function compareVersions(a: string, b: string) {
  const left = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length, 3);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function getActiveDeliveryFeatures(entitlements: ClientEntitlements | null) {
  const fromDelivery = entitlements?.deliveryFeatures ?? {};
  const fromPlatform = entitlements?.platformFeatures ?? {};
  return {
    deliveryRemote: fromDelivery.deliveryRemote === true || fromPlatform.deliveryRemote === true,
    deliveryHybrid: fromDelivery.deliveryHybrid === true || fromPlatform.deliveryHybrid === true,
  } satisfies Record<ClientDeliveryFeatureKey, boolean>;
}

function getVersionAssessments(entitlements: ClientEntitlements | null): ClientEntitlementAssessment[] {
  const combined = [
    ...(entitlements?.defaultAssessments ?? []),
    ...(entitlements?.additionalAssessments ?? []),
  ];

  if (combined.length > 0) {
    return combined.map((assessment) => ({
      slug: assessment.slug,
      title: assessment.title,
      maxVersion: assessment.maxVersion,
      summary: "summary" in assessment ? assessment.summary : null,
      availableVersions: assessment.availableVersions ?? [],
      upgradeableVersions: assessment.upgradeableVersions ?? [],
    }));
  }

  return (entitlements?.versionUpgradeAssessments ?? []).map((assessment) => ({
    slug: assessment.slug,
    title: assessment.title,
    maxVersion: assessment.maxVersion,
    summary: assessment.summary,
    availableVersions: assessment.availableVersions ?? [],
    upgradeableVersions: assessment.upgradeableVersions ?? [],
  }));
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
  const versionAssessments = useMemo(() => getVersionAssessments(entitlements), [entitlements]);
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
        assessments: versionAssessments,
      }),
    [draft, currentSeats, activeDeliveryFeatures, versionAssessments]
  );

  const bundleItems = useMemo(
    () =>
      buildUpgradeBundleItems({
        draft,
        currentSeats,
        activeDeliveryFeatures,
        assessments: versionAssessments,
      }),
    [draft, currentSeats, activeDeliveryFeatures, versionAssessments]
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

  const usingCustomAssessment = requestableAssessments.length === 0;

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

  const handleSubmit = async () => {
    setFieldError(null);

    if (bundleItems.length === 0) {
      setFieldError("Add at least one change to your upgrade request.");
      return;
    }

    if (draft.addonAssessmentSlug && draft.addonNotes.trim().length < 20) {
      setFieldError("Explain why you need the add-on assessment (at least 20 characters).");
      return;
    }

    for (const assessment of versionAssessments) {
      if (draft.assessmentVersions[assessment.slug] !== CUSTOM_ASSESSMENT_VERSION) continue;
      const brief = draft.customVersionNotes[assessment.slug]?.trim() ?? "";
      if (brief.length > 0 && brief.length < 20) {
        setFieldError(`Describe your custom ${assessment.title} content pack (at least 20 characters).`);
        return;
      }
    }

    try {
      await onSubmit({
        type: "upgrade_bundle",
        items: buildUpgradeBundleItems({
          draft,
          currentSeats,
          activeDeliveryFeatures,
          assessments: versionAssessments,
        }),
        notes: draft.notes.trim() || undefined,
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
            ? "Stage seats, delivery methods, assessment versions, and add-ons in one billing request."
            : "Upgrade requests will be available once your organisation has a contract on file."
        }
      />

      {!canRequestUpgrades ? (
        <p className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground dark:border-white/5">
          Contact CTRL support if you need help setting up your initial contract.
        </p>
      ) : null}

      <div className={cn("space-y-5", !canRequestUpgrades && "pointer-events-none opacity-60")}>
        <div className="grid gap-4 md:grid-cols-2">
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

        <section className={cn(portalPanelClass, "space-y-3 p-4")}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            Delivery methods
          </div>
          <ul className="space-y-2">
            {CLIENT_DELIVERY_FEATURES.map((feature) => {
              const active = activeDeliveryFeatures[feature.key];
              const queued = draft.deliveryFeatures[feature.key];
              return (
                <li key={feature.key} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{feature.label}</p>
                    <p className="text-xs text-muted-foreground">{feature.group}</p>
                  </div>
                  {active ? (
                    <Badge variant="outline" className={cn("rounded-lg text-[10px] font-semibold", portalBadgeClass)}>
                      Active
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant={queued ? "default" : "outline"}
                      className="rounded-xl"
                      onClick={() => toggleDeliveryFeature(feature.key)}
                    >
                      {queued ? "Queued" : "Add"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        </div>

        <section className={cn(portalPanelClass, "space-y-4 p-4")}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            Assessment versions
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {versionAssessments.map((assessment) => {
              const options =
                (assessment.upgradeableVersions?.length ?? 0) > 0
                  ? assessment.upgradeableVersions ?? []
                  : (assessment.availableVersions ?? []).filter(
                      (option) => compareVersions(option.version, assessment.maxVersion) > 0
                    );
              const selected =
                draft.assessmentVersions[assessment.slug] ?? assessment.maxVersion;
              const isCustom = selected === CUSTOM_ASSESSMENT_VERSION;

              return (
                <div key={assessment.slug} className="rounded-xl border border-border/50 p-4 dark:border-white/5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{assessment.title}</p>
                      <p className="text-xs text-muted-foreground">Current access: up to v{assessment.maxVersion}</p>
                    </div>
                    {options.length === 0 && !isCustom ? (
                      <Badge variant="outline" className="rounded-lg text-[10px] font-semibold">
                        Custom pack available
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-3 space-y-2">
                    <Label className="text-xs text-muted-foreground">Requested access</Label>
                    <Select
                      value={selected}
                      onValueChange={(value) => {
                        setDraft((current) => ({
                          ...current,
                          assessmentVersions: {
                            ...current.assessmentVersions,
                            [assessment.slug]: value,
                          },
                        }));
                      }}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={assessment.maxVersion}>
                          Keep v{assessment.maxVersion} (no change)
                        </SelectItem>
                        {options.map((option) => (
                          <SelectItem key={option.version} value={option.version}>
                            Up to v{option.version}
                            {option.title ? ` · ${option.title}` : ""}
                          </SelectItem>
                        ))}
                        <SelectItem value={CUSTOM_ASSESSMENT_VERSION}>
                          Custom content pack
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isCustom ? (
                    <div className="mt-3 space-y-2">
                      <Label htmlFor={`custom-version-${assessment.slug}`} className="text-xs">
                        Custom content brief
                      </Label>
                      <Textarea
                        id={`custom-version-${assessment.slug}`}
                        value={draft.customVersionNotes[assessment.slug] ?? ""}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            customVersionNotes: {
                              ...current.customVersionNotes,
                              [assessment.slug]: event.target.value,
                            },
                          }))
                        }
                        placeholder={getCustomVersionPlaceholder(assessment.slug)}
                        rows={3}
                        className="resize-none rounded-xl text-sm"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        For example: bespoke typing passages, a tailored PJA/SJA scenario pack, or organisation-specific wording.
                      </p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <section className={cn(portalPanelClass, "space-y-3 p-4")}>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <BookOpenCheck className="h-4 w-4" aria-hidden="true" />
            Add-on assessment
          </div>
          {usingCustomAssessment ? (
            <div className="space-y-2">
              <Label htmlFor="custom-addon-name">Assessment to add</Label>
              <Input
                id="custom-addon-name"
                value={draft.customAddonName}
                onChange={(event) =>
                  updateDraft({
                    customAddonName: event.target.value,
                    addonAssessmentSlug: event.target.value.trim() ? "custom-request" : null,
                    addonAssessmentLabel: event.target.value.trim() || null,
                  })
                }
                placeholder="Name of the assessment you want to add"
                className="rounded-xl"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Add-on assessment</Label>
              <Select
                value={draft.addonAssessmentSlug ?? "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    updateDraft({
                      addonAssessmentSlug: null,
                      addonAssessmentLabel: null,
                      addonNotes: "",
                    });
                    return;
                  }
                  const match = requestableAssessments.find((assessment) => assessment.slug === value);
                  updateDraft({
                    addonAssessmentSlug: value,
                    addonAssessmentLabel: match?.title ?? value,
                  });
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Optional add-on" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {requestableAssessments.map((assessment) => (
                    <SelectItem key={assessment.slug} value={assessment.slug}>
                      {assessment.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(draft.addonAssessmentSlug || draft.customAddonName.trim()) ? (
            <div className="space-y-2">
              <Label htmlFor="addon-notes">Why do you need this assessment?</Label>
              <Textarea
                id="addon-notes"
                value={draft.addonNotes}
                onChange={(event) => updateDraft({ addonNotes: event.target.value })}
                placeholder="Describe the role, campaign, or business need (min. 20 characters)"
                rows={3}
                className="resize-none rounded-xl"
              />
            </div>
          ) : null}
        </section>

        <section className={cn(portalPanelClass, "space-y-3 p-4")}>
          <Label htmlFor="upgrade-notes">Additional context (optional)</Label>
          <Textarea
            id="upgrade-notes"
            value={draft.notes}
            onChange={(event) => updateDraft({ notes: event.target.value })}
            placeholder="Timeline, rollout plans, or commercial context"
            rows={3}
            className="resize-none rounded-xl"
          />
        </section>

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
