"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  CalendarRange,
  CheckCircle2,
  Clock3,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/components/dashboard/client/client-portal-utils";
import { ClientUpgradeBuilder } from "@/components/dashboard/client/client-upgrade-builder";
import { ClientSeatDecreasePanel } from "@/components/dashboard/client/client-seat-decrease-panel";
import { ClientDataRetentionNotice } from "@/components/dashboard/client/client-data-retention-notice";
import {
  ClientErrorBanner,
  ClientPageHeader,
  ClientRefreshButton,
} from "@/components/dashboard/client/client-portal-ui";
import {
  PortalEmptyState,
  PortalPanel,
  PortalSectionHeader,
  PortalStatTile,
} from "@/components/dashboard/portal/portal-ui";
import {
  portalBadgeClass,
  portalPanelClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { useClientPortal } from "@/context/client-portal-provider";
import {
  CLIENT_DELIVERY_FEATURES,
  DEFAULT_PLATFORM_ASSESSMENTS,
  type ClientUpgradeRequestType,
} from "@/lib/client/entitlements";
import { formatMoney } from "@/lib/money";
import { resolveMinimumContractedSeats } from "@/lib/client/contract-seat-limits";
import { cn } from "@/lib/utils";

const UPGRADE_TYPE_LABELS: Record<ClientUpgradeRequestType, string> = {
  seat_increase: "Seat increase",
  seat_decrease: "Seat reduction",
  new_assessment: "New assessment",
  delivery_feature: "Delivery feature",
  upgrade_bundle: "Bundled upgrade",
  contract_extension: "Contract renewal",
  contract_activation: "Contract activation",
};

const BILLING_STATUS_LABELS: Record<string, string> = {
  requested: "Awaiting invoice",
  invoice_sent: "Invoice ready",
  paid: "Paid",
  failed: "Payment failed",
};

function billingStatusLabel(request: { upgradeType: string; billingStatus?: string }) {
  const status = request.billingStatus ?? "requested";
  if (request.upgradeType === "seat_decrease") {
    if (status === "requested") return "Awaiting processing";
    if (status === "paid") return "Processed";
  }
  return BILLING_STATUS_LABELS[status] ?? "Requested";
}

const BILLING_STATUS_CLASSES: Record<string, string> = {
  requested: portalBadgeClass,
  invoice_sent: portalBadgeClass,
  paid: portalBadgeClass,
  failed: portalBadgeClass,
};

export function ClientUpgradeContent() {
  const {
    summary,
    entitlements,
    upgradeRequests,
    seatSlots,
    entitlementsLoading,
    upgradeRequestsLoading,
    error,
    setError,
    loadEntitlements,
    loadUpgradeRequests,
    markUpgradeRequestPaid,
    updateAutoRenew,
    autoRenewBusy,
    redirectToBillingPortal,
    submitUpgradeRequest,
    submittingUpgrade,
  } = useClientPortal();

  const [payingRequestId, setPayingRequestId] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [billingPortalLoading, setBillingPortalLoading] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleOpenBillingPortal = async () => {
    setBillingPortalLoading(true);
    try {
      await redirectToBillingPortal();
    } finally {
      setBillingPortalLoading(false);
    }
  };

  const contract = entitlements?.contract ?? summary?.activeContract ?? null;
  const seats = summary?.seats;
  const canRequestUpgrades = entitlements?.canRequestUpgrades !== false;
  const currentSeats = contract?.seatCount ?? seats?.limit ?? 0;
  const minimumContractedSeats =
    entitlements?.contract?.minimumContractedSeats
    ?? resolveMinimumContractedSeats({ tier: contract?.tier });

  const activationInvoice = useMemo(
    () =>
      upgradeRequests.find(
        (request) =>
          request.requestKind === "contract_activation" && request.billingStatus === "invoice_sent"
      ) ?? null,
    [upgradeRequests]
  );


  const defaultAssessments =
    entitlements?.defaultAssessments ??
    DEFAULT_PLATFORM_ASSESSMENTS.map((assessment) => ({
      slug: assessment.key,
      title: assessment.title,
      maxVersion: "1.0.0",
      includedByDefault: true,
      availableVersions: [],
    }));

  const deliveryFeatures = useMemo(() => {
    const fromDelivery = entitlements?.deliveryFeatures ?? {};
    const fromPlatform = entitlements?.platformFeatures ?? {};
    return CLIENT_DELIVERY_FEATURES.map((feature) => ({
      ...feature,
      active:
        fromDelivery[feature.key] === true || fromPlatform[feature.key] === true,
    }));
  }, [entitlements?.deliveryFeatures, entitlements?.platformFeatures]);

  const activeDeliveryFeatureCount = deliveryFeatures.filter((feature) => feature.active).length;

  const openRequests = useMemo(
    () => upgradeRequests.filter((request) => request.billingStatus !== "paid"),
    [upgradeRequests]
  );

  const refreshAll = () => {
    void loadEntitlements(true);
    void loadUpgradeRequests(true);
  };

  useEffect(() => {
    const paid = searchParams.get("paid");
    const sessionId = searchParams.get("session_id");
    if (paid !== "1" || !sessionId) return;

    let cancelled = false;
    const confirmPayment = async () => {
      setConfirmingPayment(true);
      setError(null);
      try {
        const response = await fetch("/api/client/billing/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stripeCheckoutSessionId: sessionId }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(body.error ?? "Payment could not be confirmed");
        }
        const paidRequestId = (body as { data?: { billingRequestDocumentId?: string } }).data
          ?.billingRequestDocumentId;
        if (paidRequestId) {
          markUpgradeRequestPaid(paidRequestId);
        }
        await Promise.all([loadEntitlements(true), loadUpgradeRequests(true)]);
        if (!cancelled) {
          router.replace("/client-dashboard/upgrade-requests/");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Payment could not be confirmed");
        }
      } finally {
        if (!cancelled) {
          setConfirmingPayment(false);
        }
      }
    };

    void confirmPayment();
    return () => {
      cancelled = true;
    };
  }, [searchParams, loadEntitlements, loadUpgradeRequests, markUpgradeRequestPaid, router, setError]);

  const payForUpgrade = async (billingRequestDocumentId: string) => {
    setPayingRequestId(billingRequestDocumentId);
    setError(null);
    try {
      const response = await fetch("/api/client/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingRequestDocumentId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? "Checkout could not be opened");
      }
      if (!body.data?.checkoutUrl) {
        throw new Error("Checkout link is unavailable. Contact CTRL support if this persists.");
      }
      window.location.href = body.data.checkoutUrl as string;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout could not be opened");
    } finally {
      setPayingRequestId(null);
    }
  };

  return (
    <div className="relative mx-auto max-w-7xl space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <ClientPageHeader
        title="Upgrade requests"
        description="Review your contract entitlements and submit one structured billing request for seats, delivery methods, or assessment add-ons."
        notice={
          error ? (
            <ClientErrorBanner message={error} />
          ) : activationInvoice ? (
            <ClientErrorBanner tone="info">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Your initial contract activation invoice is ready
                  {activationInvoice.amountDuePence
                    ? ` (${formatMoney(activationInvoice.amountDuePence, activationInvoice.currency ?? "gbp")})`
                    : ""}
                  . Pay now to start your one-year contract term and unlock the platform.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  disabled={payingRequestId === activationInvoice.id}
                  onClick={() => void payForUpgrade(activationInvoice.id)}
                >
                  {payingRequestId === activationInvoice.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Pay activation invoice
                </Button>
              </div>
            </ClientErrorBanner>
          ) : entitlementsLoading && !entitlements ? (
            <ClientErrorBanner tone="info">Loading your entitlements catalogue…</ClientErrorBanner>
          ) : !entitlements && !entitlementsLoading ? (
            <ClientErrorBanner tone="error">
              Entitlements could not be loaded. Refresh the page or contact CTRL support.
            </ClientErrorBanner>
          ) : null
        }
        action={
          <ClientRefreshButton
            onClick={refreshAll}
            loading={entitlementsLoading || upgradeRequestsLoading || confirmingPayment}
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <PortalStatTile
          label="Contracted seats"
          value={contract?.seatCount ?? seats?.limit ?? "…"}
          detail={`${seats?.used ?? 0} currently in use`}
          icon={Users}
        />
        <PortalStatTile
          label="Delivery methods"
          value={`${activeDeliveryFeatureCount}/${CLIENT_DELIVERY_FEATURES.length}`}
          detail="Remote and hybrid delivery on your account"
          icon={CheckCircle2}
        />
        <PortalStatTile
          label="Open upgrade requests"
          value={openRequests.length}
          detail="Awaiting CTRL review"
          icon={Clock3}
        />
      </div>

      <div className="space-y-8">
        <PortalPanel>
          <div className="space-y-6 p-6">
            <PortalSectionHeader
              eyebrow="Your plan"
              title="Current entitlements"
              description="Live contract limits and platform access for this client account."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <div className={cn(portalPanelClass, "p-4 flex flex-col justify-between")}>
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <CalendarRange className="h-4 w-4" aria-hidden="true" />
                    Contract period
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    {contract?.startDate && contract?.endDate
                      ? `${formatDate(contract.startDate)} – ${formatDate(contract.endDate)}`
                      : "Pending activation — term starts on payment"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Billing: {entitlements?.contractActive ? "Active" : "Inactive or payment pending"} ·{" "}
                    {entitlements?.contract?.paymentStatus?.replace(/_/g, " ") ?? "not required"}
                    {entitlements?.contract?.daysUntilExpiry != null ? (
                      <>
                        {" "}
                        ·{" "}
                        {entitlements.contract.daysUntilExpiry <= 30 ? (
                          <span className="font-medium text-foreground">
                            {entitlements.contract.daysUntilExpiry} days until renewal
                          </span>
                        ) : (
                          <span>{entitlements.contract.daysUntilExpiry} days remaining</span>
                        )}
                      </>
                    ) : null}
                  </p>
                </div>
                {contract && (
                  <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 dark:border-white/5">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-renew" className="text-xs font-semibold text-foreground">
                        Auto-renew contract
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        When enabled, we&apos;ll email you 30 days before your contract ends with a
                        link to set up Direct Debit for the next year. You won&apos;t be charged
                        until your renewal starts.
                      </p>
                    </div>
                    <Switch
                      id="auto-renew"
                      checked={entitlements?.client?.autoRenew ?? false}
                      onCheckedChange={(checked) => void updateAutoRenew(checked)}
                      disabled={autoRenewBusy}
                    />
                  </div>
                )}
              </div>
              <div className={cn(portalPanelClass, "p-4")}>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Users className="h-4 w-4" aria-hidden="true" />
                  Seat usage
                </div>
                <p className="mt-3 font-display text-2xl font-semibold text-foreground">
                  {seats?.used ?? 0}/{contract?.seatCount ?? seats?.limit ?? "—"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {seats?.available ?? 0} seat{(seats?.available ?? 0) === 1 ? "" : "s"} available
                </p>
              </div>
            </div>

            <ClientDataRetentionNotice entitlements={entitlements} />

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Delivery methods
                </p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {deliveryFeatures.map((feature) => (
                    <li
                      key={feature.key}
                      className={cn(portalPanelClass, "flex items-center justify-between gap-3 px-4 py-3")}
                    >
                      <div>
                        <p className="text-sm font-semibold text-foreground">{feature.label}</p>
                        <p className="text-xs text-muted-foreground">{feature.group}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 rounded-lg text-[10px] font-semibold",
                          feature.active ? portalBadgeClass : "text-muted-foreground"
                        )}
                      >
                        {feature.active ? "Active" : "Not included"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Core assessments
                </p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {defaultAssessments.map((assessment) => (
                    <li key={assessment.slug} className={cn(portalPanelClass, "px-4 py-3")}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">{assessment.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Included on platform</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 rounded-lg text-[10px] font-semibold">
                          v{assessment.maxVersion}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {(entitlements?.additionalAssessments.length ?? 0) > 0 ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Add-on assessments active
                </p>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {entitlements?.additionalAssessments.map((assessment) => (
                    <li key={assessment.slug} className={cn(portalPanelClass, "px-4 py-3")}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{assessment.title}</p>
                        <Badge
                          variant="outline"
                          className={cn("shrink-0 rounded-lg text-[10px] font-semibold", portalBadgeClass)}
                        >
                          v{assessment.maxVersion}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </PortalPanel>

        {entitlements ? (
          <PortalPanel>
            <div className="p-6">
              <ClientUpgradeBuilder
                entitlements={entitlements}
                canRequestUpgrades={canRequestUpgrades}
                submitting={submittingUpgrade}
                onSubmit={async (payload) => {
                  await submitUpgradeRequest({ payload });
                }}
              />
            </div>
          </PortalPanel>
        ) : null}

        {entitlements && currentSeats > minimumContractedSeats ? (
          <PortalPanel>
            <div className="p-6">
              <ClientSeatDecreasePanel
                currentSeats={currentSeats}
                minimumContractedSeats={minimumContractedSeats}
                seatSlots={seatSlots}
                canRequestUpgrades={canRequestUpgrades}
                submitting={submittingUpgrade}
                onSubmit={async (payload) => {
                  await submitUpgradeRequest({ payload });
                }}
              />
            </div>
          </PortalPanel>
        ) : null}

        <PortalPanel>
          <div className="p-6 space-y-4">
            <PortalSectionHeader
              eyebrow="Billing"
              title="Payment methods and invoices"
              description="Update your Direct Debit details or download past invoices. To change seats, assessments, or delivery features, use the upgrade builder above — CTRL will send a pro-rated invoice aligned to your contract."
            />
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={handleOpenBillingPortal}
                disabled={billingPortalLoading}
                className="rounded-xl font-semibold px-6 py-2"
              >
                {billingPortalLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Opening billing portal…
                  </>
                ) : (
                  <>
                    Payment methods & invoices
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </PortalPanel>

        <div id="upgrade-request-history">
          <PortalPanel>
            <div className="space-y-5 p-6">
              <PortalSectionHeader
                eyebrow="History"
                title="Your upgrade requests"
                description="Structured billing requests submitted from this portal. These are separate from general support messages."
              />

              {upgradeRequestsLoading && upgradeRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">Loading upgrade requests…</p>
              ) : null}

              {!upgradeRequestsLoading && upgradeRequests.length === 0 ? (
                <PortalEmptyState
                  icon={TrendingUp}
                  title="No upgrade requests yet"
                  description="Use the upgrade builder above to stage changes and submit one billing request."
                />
              ) : null}

              {upgradeRequests.length > 0 ? (
                <ul className="space-y-3">
                  {upgradeRequests.map((request) => (
                    <li key={request.id} className={cn(portalPanelClass, "p-4")}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="rounded-full text-[10px] font-semibold">
                              {UPGRADE_TYPE_LABELS[request.upgradeType]}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-full text-[10px] font-semibold",
                                BILLING_STATUS_CLASSES[request.billingStatus ?? "requested"] ??
                                  BILLING_STATUS_CLASSES.requested
                              )}
                            >
                              {billingStatusLabel(request)}
                            </Badge>
                          </div>
                          <p className="font-mono text-xs font-semibold text-muted-foreground">
                            {request.requestNumber || request.ticketNumber}
                          </p>
                          <p className="text-sm font-semibold text-foreground">{request.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            Submitted {formatDate(request.createdAt)}
                          </p>
                          {request.billingStatus === "invoice_sent" &&
                          request.upgradeType !== "seat_decrease" ? (
                            <p className="text-xs font-medium text-muted-foreground">
                              Invoice ready
                              {request.amountDuePence
                                ? ` · ${formatMoney(request.amountDuePence, request.currency ?? "gbp")}`
                                : ""}
                            </p>
                          ) : null}
                        </div>
                        {request.billingStatus === "invoice_sent" &&
                        request.upgradeType !== "seat_decrease" ? (
                          <Button
                            size="sm"
                            className="rounded-xl gap-2"
                            disabled={payingRequestId === request.id}
                            onClick={() => void payForUpgrade(request.id)}
                          >
                            {payingRequestId === request.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : null}
                            Pay now
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="flex justify-end border-t border-border/50 pt-4 dark:border-white/5">
                <Button asChild variant="outline" className="rounded-xl gap-2">
                  <Link href="#upgrade-request-history">
                    View all requests
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </PortalPanel>
        </div>
      </div>
    </div>
  );
}
