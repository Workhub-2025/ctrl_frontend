"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  BookOpenCheck,
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
import { formatDate } from "@/components/dashboard/client/client-portal-utils";
import { ClientUpgradeRequestDialog } from "@/components/dashboard/client/client-upgrade-request-dialog";
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
  CLIENT_PLATFORM_FEATURES,
  type ClientInitiatedUpgradeType,
  type ClientUpgradeRequestType,
} from "@/lib/client/entitlements";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";

const REQUEST_ACTIONS: Array<{
  type: ClientInitiatedUpgradeType;
  title: string;
  description: string;
  icon: typeof Users;
}> = [
  {
    type: "seat_increase",
    title: "More hiring manager seats",
    description: "Expand reusable seat capacity on your contract.",
    icon: Users,
  },
  {
    type: "new_assessment",
    title: "New add-on assessment",
    description: "Request assessments beyond the core SJA, TA, PJA, and SCA platform.",
    icon: BookOpenCheck,
  },
  {
    type: "assessment_version",
    title: "Assessment version upgrade",
    description: "Move to newer content for assessments you already use.",
    icon: TrendingUp,
  },
];

const UPGRADE_TYPE_LABELS: Record<ClientUpgradeRequestType, string> = {
  seat_increase: "Seat increase",
  new_assessment: "New assessment",
  assessment_version: "Version upgrade",
  contract_extension: "Contract renewal",
};

const BILLING_STATUS_LABELS: Record<string, string> = {
  requested: "Awaiting invoice",
  invoice_sent: "Invoice ready",
  paid: "Paid",
  failed: "Payment failed",
};

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
    entitlementsLoading,
    upgradeRequestsLoading,
    submittingUpgrade,
    error,
    setError,
    loadEntitlements,
    loadUpgradeRequests,
    markUpgradeRequestPaid,
    submitUpgradeRequest,
  } = useClientPortal();

  const [activeRequestType, setActiveRequestType] = useState<ClientInitiatedUpgradeType | null>(null);
  const [payingRequestId, setPayingRequestId] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  const contract = entitlements?.contract ?? summary?.activeContract ?? null;
  const seats = summary?.seats;

  const activeFeatures = useMemo(
    () =>
      CLIENT_PLATFORM_FEATURES.filter(
        (feature) => entitlements?.platformFeatures?.[feature.key] === true
      ),
    [entitlements?.platformFeatures]
  );

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

  const payForUpgrade = async (ticketDocumentId: string) => {
    setPayingRequestId(ticketDocumentId);
    setError(null);
    try {
      const response = await fetch("/api/client/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingRequestDocumentId: ticketDocumentId }),
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
        description="Review your contract entitlements and submit structured requests for seats, assessments, or content versions."
        notice={error ? <ClientErrorBanner message={error} /> : null}
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
          label="Active features"
          value={activeFeatures.length}
          detail={`${CLIENT_PLATFORM_FEATURES.length} optional features available`}
          icon={CheckCircle2}
        />
        <PortalStatTile
          label="Open upgrade requests"
          value={openRequests.length}
          detail="Awaiting CTRL review"
          icon={Clock3}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <PortalPanel>
            <div className="space-y-6 p-6">
              <PortalSectionHeader
                eyebrow="Your plan"
                title="Current entitlements"
                description="Live contract limits and platform access for this client account."
              />

              <div className="grid gap-4 md:grid-cols-2">
                <div className={cn(portalPanelClass, "p-4")}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <CalendarRange className="h-4 w-4" aria-hidden="true" />
                    Contract period
                  </div>
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    {formatDate(contract?.startDate)} – {formatDate(contract?.endDate)}
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

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Platform features
                </p>
                {activeFeatures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No optional delivery or scoring features are active yet.
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-2">
                    {activeFeatures.map((feature) => (
                      <li key={feature.key}>
                        <Badge
                          variant="outline"
                          className={cn("rounded-full px-3 py-1 text-[11px] font-semibold", portalBadgeClass)}
                        >
                          {feature.label}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Core assessments (included)
                </p>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {(entitlements?.defaultAssessments ?? []).map((assessment) => (
                    <li
                      key={assessment.slug}
                      className={cn(portalPanelClass, "px-4 py-3")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{assessment.title}</p>
                          <p className="text-xs text-muted-foreground">Included on every client platform</p>
                        </div>
                        <Badge variant="outline" className="shrink-0 rounded-lg text-[10px] font-semibold">
                          up to v{assessment.maxVersion}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Add-on assessments
                </p>
                {(entitlements?.additionalAssessments.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No add-on assessments are active on this account yet. Submit a new add-on
                    assessment request to request one.
                  </p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {entitlements?.additionalAssessments.map((assessment) => (
                      <li
                        key={assessment.slug}
                        className={cn(portalPanelClass, "px-4 py-3")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{assessment.title}</p>
                            {assessment.summary ? (
                              <p className="text-xs text-muted-foreground">{assessment.summary}</p>
                            ) : null}
                          </div>
                          <Badge
                            variant="outline"
                            className={cn("shrink-0 rounded-lg text-[10px] font-semibold", portalBadgeClass)}
                          >
                            up to v{assessment.maxVersion}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </PortalPanel>

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
                  description="Submit a request using one of the options on the right when you need more capacity or content."
                />
              ) : null}

              {upgradeRequests.length > 0 ? (
                <ul className="space-y-3">
                  {upgradeRequests.map((request) => (
                    <li
                      key={request.id}
                      className={cn(portalPanelClass, "p-4")}
                    >
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
                              {BILLING_STATUS_LABELS[request.billingStatus ?? "requested"] ?? "Requested"}
                            </Badge>
                          </div>
                          <p className="font-mono text-xs font-semibold text-muted-foreground">
                            {request.requestNumber || request.ticketNumber}
                          </p>
                          <p className="text-sm font-semibold text-foreground">{request.subject}</p>
                          <p className="text-xs text-muted-foreground">
                            Submitted {formatDate(request.createdAt)}
                          </p>
                          {request.billingStatus === "invoice_sent" ? (
                            <p className="text-xs font-medium text-muted-foreground">
                              Invoice ready
                              {request.amountDuePence
                                ? ` · ${formatMoney(request.amountDuePence, request.currency ?? "gbp")}`
                                : ""}
                            </p>
                          ) : null}
                        </div>
                        {request.billingStatus === "invoice_sent" ? (
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
                  <Link href="/client-dashboard/messages/">
                    View all messages
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </PortalPanel>
        </div>

        <PortalPanel className="h-fit">
          <div className="space-y-4 p-6">
            <PortalSectionHeader
              eyebrow="Request an upgrade"
              title="What do you need?"
              description="Each request is routed to CTRL with the details our team needs to quote and approve changes."
            />
            <div className="space-y-3">
              {REQUEST_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.type}
                    type="button"
                    onClick={() => setActiveRequestType(action.type)}
                    className={cn(portalPanelClass, "flex w-full items-start gap-3 p-4 text-left transition-colors hover:border-primary/30")}
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground">{action.title}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                        {action.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </PortalPanel>
      </div>

      {activeRequestType ? (
        <ClientUpgradeRequestDialog
          open={Boolean(activeRequestType)}
          onOpenChange={(open) => !open && setActiveRequestType(null)}
          requestType={activeRequestType}
          entitlements={entitlements}
          submitting={submittingUpgrade}
          onSubmit={async (payload) => {
            await submitUpgradeRequest({ payload });
          }}
        />
      ) : null}
    </div>
  );
}
