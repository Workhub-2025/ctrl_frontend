"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  CalendarRange,
  CreditCard,
  Loader2,
  Receipt,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDate } from "@/components/dashboard/client/client-portal-utils";
import { ClientUpgradeBuilder } from "@/components/dashboard/client/client-upgrade-builder";
import { ClientDataRetentionNotice } from "@/components/dashboard/client/client-data-retention-notice";
import {
  ClientPaymentConfirmDialog,
  type PendingPayment,
} from "@/components/dashboard/client/client-payment-confirm-dialog";
import {
  ClientErrorBanner,
  ClientPageHeader,
  ClientRefreshButton,
} from "@/components/dashboard/client/client-portal-ui";
import {
  PortalEmptyState,
  PortalPanel,
  PortalSectionHeader,
} from "@/components/dashboard/portal/portal-ui";
import {
  portalBadgeClass,
  portalLabelClass,
  portalPanelClass,
  portalPanelNestedClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { useClientPortal } from "@/context/client-portal-provider";
import {
  CLIENT_DELIVERY_FEATURES,
  type ClientUpgradeRequestType,
} from "@/lib/client/entitlements";
import { formatMoney } from "@/lib/money";
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

function billingStatusLabel(request: {
  upgradeType: string;
  billingStatus?: string;
}) {
  const status = request.billingStatus ?? "requested";
  if (request.upgradeType === "seat_decrease") {
    if (status === "requested") return "Awaiting processing";
    if (status === "paid") return "Processed";
  }
  return BILLING_STATUS_LABELS[status] ?? "Requested";
}

function isPayableRequest(request: {
  billingStatus?: string;
  upgradeType?: string;
  amountDuePence?: number | null;
}) {
  return (
    request.upgradeType !== "seat_decrease" &&
    (request.amountDuePence ?? 0) > 0 &&
    (request.billingStatus === "invoice_sent" ||
      request.billingStatus === "requested")
  );
}

function pendingPaymentFromRequest(request: {
  id: string;
  subject: string;
  amountDuePence?: number | null;
  currency?: string | null;
  payload?: { type?: string; lineItems?: PendingPayment["lineItems"] };
}): PendingPayment {
  return {
    id: request.id,
    subject: request.subject,
    amountDuePence: request.amountDuePence ?? null,
    currency: request.currency ?? "gbp",
    ...(request.payload?.type === "upgrade_bundle" && request.payload.lineItems
      ? { lineItems: request.payload.lineItems }
      : {}),
  };
}

/**
 * Intent: client ops lead managing contract capacity, unlocks, and payments.
 * Hierarchy: actionable pay / change builder wins; history and retention demoted.
 * Feel: calm operational ledger — dense, one job per band, no dashboard clutter.
 */
export function ClientUpgradeContent() {
  const {
    summary,
    entitlements,
    upgradeRequests,
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
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(
    null
  );
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
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

  const activationInvoice = useMemo(
    () =>
      upgradeRequests.find(
        (request) =>
          request.requestKind === "contract_activation" &&
          request.billingStatus === "invoice_sent"
      ) ?? null,
    [upgradeRequests]
  );

  const payableRequests = useMemo(
    () => upgradeRequests.filter(isPayableRequest),
    [upgradeRequests]
  );

  const deliveryFeatures = useMemo(() => {
    const fromDelivery = entitlements?.deliveryFeatures ?? {};
    const fromPlatform = entitlements?.platformFeatures ?? {};
    return CLIENT_DELIVERY_FEATURES.map((feature) => ({
      ...feature,
      active:
        fromDelivery[feature.key] === true || fromPlatform[feature.key] === true,
    }));
  }, [entitlements?.deliveryFeatures, entitlements?.platformFeatures]);

  const refreshAll = () => {
    void loadEntitlements(true);
    void loadUpgradeRequests(true);
  };

  useEffect(() => {
    const paid = searchParams.get("paid");
    const sessionId =
      searchParams.get("session_id") ?? searchParams.get("invoice_id");
    if (paid !== "1" || !sessionId) return;

    let cancelled = false;
    const confirmPayment = async () => {
      setConfirmingPayment(true);
      setPaymentConfirmed(false);
      setError(null);
      try {
        const response = await fetch("/api/client/billing/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stripeCheckoutSessionId: sessionId }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            typeof body.error === "string"
              ? body.error
              : "Payment could not be confirmed. If you were charged, refresh billing or contact CTRL support."
          );
        }
        const paidRequestId = (
          body as { data?: { billingRequestDocumentId?: string } }
        ).data?.billingRequestDocumentId;
        if (paidRequestId) {
          markUpgradeRequestPaid(paidRequestId);
        }
        await Promise.all([loadEntitlements(true), loadUpgradeRequests(true)]);
        if (!cancelled) {
          setPaymentConfirmed(true);
          router.replace("/client-dashboard/billing/");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Payment could not be confirmed"
          );
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
  }, [
    searchParams,
    loadEntitlements,
    loadUpgradeRequests,
    markUpgradeRequestPaid,
    router,
    setError,
  ]);

  const payForUpgrade = async (billingRequestDocumentId: string) => {
    setPayingRequestId(billingRequestDocumentId);
    setError(null);
    setPaymentConfirmed(false);
    try {
      const response = await fetch("/api/client/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingRequestDocumentId }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Checkout could not be opened"
        );
      }
      const data = body.data as
        | {
            checkoutUrl?: string | null;
            fulfilled?: boolean;
            stripeCheckoutSessionId?: string;
            billingStatus?: string;
          }
        | undefined;
      if (data?.fulfilled || data?.billingStatus === "paid") {
        markUpgradeRequestPaid(billingRequestDocumentId);
        await Promise.all([loadEntitlements(true), loadUpgradeRequests(true)]);
        setPaymentConfirmed(true);
        return;
      }
      if (!data?.checkoutUrl) {
        throw new Error(
          "Checkout link is unavailable. Contact CTRL support if this persists."
        );
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Checkout could not be opened"
      );
    } finally {
      setPayingRequestId(null);
      setPendingPayment(null);
    }
  };

  const seatLimit = seats?.limit ?? contract?.seatCount ?? null;
  const seatUsed = seats?.used ?? 0;
  const seatAvailable = seats?.available ?? 0;

  return (
    <div className="relative mx-auto max-w-6xl space-y-10 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <ClientPageHeader
        title="Billing"
        description="Contract, seat capacity, premium unlocks, and Stripe invoices for this organisation."
        notice={
          confirmingPayment ? (
            <ClientErrorBanner tone="info">
              Confirming your payment with Stripe…
            </ClientErrorBanner>
          ) : paymentConfirmed ? (
            <ClientErrorBanner tone="info">
              Payment confirmed. Your entitlements are up to date.
            </ClientErrorBanner>
          ) : activationInvoice ? (
            <ClientErrorBanner tone="warning">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Your contract is ready — payment is required to activate it
                  {activationInvoice.amountDuePence
                    ? ` (${formatMoney(
                        activationInvoice.amountDuePence,
                        activationInvoice.currency ?? "gbp"
                      )})`
                    : ""}
                  . Pay now to start your one-year term.
                </p>
                <Button
                  size="sm"
                  className="shrink-0 border-amber-600/40 bg-amber-600 text-white hover:bg-amber-700"
                  disabled={payingRequestId === activationInvoice.id}
                  onClick={() =>
                    setPendingPayment(
                      pendingPaymentFromRequest(activationInvoice)
                    )
                  }
                >
                  {payingRequestId === activationInvoice.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Pay now
                </Button>
              </div>
            </ClientErrorBanner>
          ) : entitlements?.contractActive === false ? (
            <ClientErrorBanner tone="warning">
              <p>
                {entitlements?.lockState?.userMessage ??
                  "Your organisation contract is inactive or payment is pending. Complete billing to restore full access."}
              </p>
            </ClientErrorBanner>
          ) : error && !/not operational|no_active_contract/i.test(error) ? (
            <ClientErrorBanner message={error} />
          ) : entitlementsLoading && !entitlements ? (
            <ClientErrorBanner tone="info">
              Loading your billing catalogue…
            </ClientErrorBanner>
          ) : !entitlements && !entitlementsLoading ? (
            <ClientErrorBanner tone="error">
              Billing could not be loaded. Refresh the page or contact CTRL
              support.
            </ClientErrorBanner>
          ) : null
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl font-semibold"
              onClick={handleOpenBillingPortal}
              disabled={billingPortalLoading}
            >
              {billingPortalLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Stripe portal
              <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
            </Button>
            <ClientRefreshButton
              onClick={refreshAll}
              loading={
                entitlementsLoading ||
                upgradeRequestsLoading ||
                confirmingPayment
              }
            />
          </div>
        }
      />

      {/* Contract strip — one composition */}
      <PortalPanel className="overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-5 border-b border-border p-6 lg:border-b-0 lg:border-r">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={portalLabelClass}>Contract</p>
                <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
                  {contract?.startDate && contract?.endDate
                    ? `${formatDate(contract.startDate)} – ${formatDate(contract.endDate)}`
                    : "Pending activation"}
                </p>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {entitlements?.contractActive ? "Active" : "Inactive"}
                  {contract?.tier
                    ? ` · ${String(contract.tier).replace(/^\w/, (c) =>
                        c.toUpperCase()
                      )}`
                    : ""}
                  {entitlements?.contract?.daysUntilExpiry != null
                    ? entitlements.contract.daysUntilExpiry <= 30
                      ? ` · ${entitlements.contract.daysUntilExpiry} days until renewal`
                      : ` · ${entitlements.contract.daysUntilExpiry} days remaining`
                    : null}
                </p>
              </div>
              <CalendarRange
                className="mt-1 h-5 w-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {deliveryFeatures.map((feature) => (
                <Badge
                  key={feature.key}
                  variant="outline"
                  className={cn(
                    "rounded-md text-[10px] font-semibold",
                    feature.active ? portalBadgeClass : "text-muted-foreground"
                  )}
                >
                  {feature.label}
                  {feature.active ? "" : " · off"}
                </Badge>
              ))}
            </div>

            {contract ? (
              <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-4">
                <div className="min-w-0 space-y-0.5">
                  <Label
                    htmlFor="auto-renew"
                    className="text-sm font-semibold text-foreground"
                  >
                    Auto-renew
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Email reminder 30 days before term end — you are not charged
                    until renewal starts.
                  </p>
                </div>
                <Switch
                  id="auto-renew"
                  checked={entitlements?.client?.autoRenew ?? false}
                  onCheckedChange={(checked) => void updateAutoRenew(checked)}
                  disabled={autoRenewBusy}
                />
              </div>
            ) : null}
          </div>

          <div className="flex flex-col justify-between gap-6 bg-muted/15 p-6">
            <div>
              <p className={portalLabelClass}>Hiring manager seats</p>
              <p className="mt-2 font-display text-4xl font-semibold tabular-nums tracking-tight text-foreground">
                {seatUsed}
                <span className="text-2xl text-muted-foreground">
                  /{seatLimit ?? "—"}
                </span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {seatAvailable} available
                {contract?.seatCount != null &&
                seats?.limit != null &&
                contract.seatCount !== seats.limit
                  ? ` · contract ${contract.seatCount}`
                  : ""}
              </p>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Seats are one-off unlocks. Increase capacity in the change builder
              below. Stripe portal holds Direct Debit details and invoice PDFs.
            </p>
          </div>
        </div>
      </PortalPanel>

      {/* Actionable payments */}
      {payableRequests.length > 0 ? (
        <section className="space-y-3">
          <PortalSectionHeader
            eyebrow="Action needed"
            title="Invoices ready to pay"
            description="Complete these to unlock the staged entitlements."
          />
          <ul className="space-y-2">
            {payableRequests.map((request) => (
              <li
                key={request.id}
                className={cn(
                  portalPanelClass,
                  "flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                )}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className="rounded-md text-[10px] font-semibold"
                    >
                      {UPGRADE_TYPE_LABELS[request.upgradeType]}
                    </Badge>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {request.requestNumber || request.ticketNumber}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">
                    {request.subject}
                  </p>
                  {request.amountDuePence ? (
                    <p className="text-xs text-muted-foreground">
                      {formatMoney(
                        request.amountDuePence,
                        request.currency ?? "gbp"
                      )}
                    </p>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  className="shrink-0 rounded-xl"
                  disabled={payingRequestId === request.id}
                  onClick={() =>
                    setPendingPayment(pendingPaymentFromRequest(request))
                  }
                >
                  {payingRequestId === request.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Pay now
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Change builder */}
      {entitlements ? (
        <section className="space-y-3">
          <PortalSectionHeader
            eyebrow="Changes"
            title="Stage an upgrade"
            description="Seats, delivery methods, and premium assessments — one billing request when you submit."
          />
          <PortalPanel>
            <div className="p-5 sm:p-6">
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
        </section>
      ) : null}

      {/* Request ledger */}
      <section id="upgrade-request-history" className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <PortalSectionHeader
            eyebrow="CTRL history"
            title="Upgrade requests"
            description="Request status in CTRL — not the Stripe invoice list. Open Stripe portal for PDFs and Direct Debit."
          />
        </div>

        <PortalPanel>
          <div className="space-y-1 p-2 sm:p-3">
            {upgradeRequestsLoading && upgradeRequests.length === 0 ? (
              <p className="px-3 py-6 text-sm text-muted-foreground">
                Loading requests…
              </p>
            ) : null}

            {!upgradeRequestsLoading && upgradeRequests.length === 0 ? (
              <PortalEmptyState
                icon={Receipt}
                title="No upgrade requests yet"
                description="Stage seats or premium assessments above to create your first billing request."
              />
            ) : null}

            {upgradeRequests.length > 0 ? (
              <ul className="divide-y divide-border/70">
                {upgradeRequests.map((request) => (
                  <li
                    key={request.id}
                    className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className="rounded-md text-[10px] font-semibold"
                        >
                          {UPGRADE_TYPE_LABELS[request.upgradeType]}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "rounded-md text-[10px] font-semibold",
                            portalBadgeClass
                          )}
                        >
                          {billingStatusLabel(request)}
                        </Badge>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {request.requestNumber || request.ticketNumber}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {request.subject}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {formatDate(request.createdAt)}
                        {isPayableRequest(request) && request.amountDuePence
                          ? ` · ${formatMoney(
                              request.amountDuePence,
                              request.currency ?? "gbp"
                            )}`
                          : ""}
                      </p>
                    </div>
                    {isPayableRequest(request) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 rounded-xl"
                        disabled={payingRequestId === request.id}
                        onClick={() =>
                          setPendingPayment(pendingPaymentFromRequest(request))
                        }
                      >
                        {payingRequestId === request.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Pay now
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </PortalPanel>

        <p className={cn(portalPanelNestedClass, "px-4 py-3 text-xs text-muted-foreground")}>
          Need a past invoice PDF or to update bank details? Use{" "}
          <button
            type="button"
            className="font-semibold text-foreground underline-offset-2 hover:underline"
            onClick={() => void handleOpenBillingPortal()}
          >
            Stripe portal
          </button>
          .
        </p>
      </section>

      <ClientDataRetentionNotice entitlements={entitlements} />

      <ClientPaymentConfirmDialog
        payment={pendingPayment}
        busy={payingRequestId !== null}
        onCancel={() => setPendingPayment(null)}
        onConfirm={() => {
          if (pendingPayment) void payForUpgrade(pendingPayment.id);
        }}
      />
    </div>
  );
}
