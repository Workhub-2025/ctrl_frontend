"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ClipboardCheck,
  KeyRound,
  Loader2,
  UserCheck,
  Users,
} from "lucide-react";
import {
  ClientErrorBanner,
  ClientPageHeader,
  ClientRefreshButton,
  ClientStatTile,
} from "@/components/dashboard/client/client-portal-ui";
import { useClientPortal } from "@/context/client-portal-provider";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { PortalDecisionLedger } from "@/components/dashboard/portal/portal-ui";

export function ClientOverviewContent() {
  const {
    summary,
    entitlements,
    upgradeRequests,
    loading,
    error,
    pendingCampaigns,
    pendingSharedCandidates,
    loadOverview,
    loadUpgradeRequests,
  } = useClientPortal();

  const [payingRequestId, setPayingRequestId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const contractInactive = entitlements?.contractActive === false;

  const activationInvoice = useMemo(
    () =>
      upgradeRequests.find(
        (request) =>
          request.requestKind === "contract_activation" && request.billingStatus === "invoice_sent"
      ) ?? null,
    [upgradeRequests]
  );
  const attentionItems = useMemo(
    () => [
      {
        count: summary?.campaignsPendingApproval ?? pendingCampaigns.length,
        href: "/client-dashboard/campaign-approvals/",
        label: "Campaigns awaiting approval",
        description: "Review campaign scope before hiring managers begin delivery.",
      },
      {
        count: summary?.candidatesPendingReview ?? pendingSharedCandidates.length,
        href: "/client-dashboard/client-approved-candidates/",
        label: "Candidates awaiting a decision",
        description: "Review shared candidate evidence and record an outcome.",
      },
    ].filter((item) => item.count > 0),
    [pendingCampaigns.length, pendingSharedCandidates.length, summary]
  );

  const payForActivation = async (billingRequestDocumentId: string) => {
    setPayingRequestId(billingRequestDocumentId);
    setPayError(null);
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
      setPayError(err instanceof Error ? err.message : "Checkout could not be opened");
    } finally {
      setPayingRequestId(null);
    }
  };

  return (
    <div className="space-y-8">
      <ClientPageHeader
        title={summary?.client?.name ?? "Overview"}
        description="Review hiring-manager capacity, campaign approvals, and candidate progression from one place."
        notice={
          error ? (
            <ClientErrorBanner tone="error">{error}</ClientErrorBanner>
          ) : payError ? (
            <ClientErrorBanner tone="error">{payError}</ClientErrorBanner>
          ) : activationInvoice ? (
            <ClientErrorBanner tone="info">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Your initial contract activation invoice is ready
                  {activationInvoice.amountDuePence
                    ? ` (${formatMoney(activationInvoice.amountDuePence, activationInvoice.currency ?? "gbp")})`
                    : ""}
                  . Pay now to start your one-year contract term.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-2"
                  disabled={payingRequestId === activationInvoice.id}
                  onClick={() => void payForActivation(activationInvoice.id)}
                >
                  {payingRequestId === activationInvoice.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  Pay now
                </Button>
              </div>
            </ClientErrorBanner>
          ) : contractInactive ? (
            <ClientErrorBanner tone="info">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  {entitlements?.lockState?.userMessage ??
                    "Your organisation contract is inactive or payment is pending. Complete billing to restore full access."}
                </p>
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link href="/client-dashboard/upgrade-requests/">View upgrade requests</Link>
                </Button>
              </div>
            </ClientErrorBanner>
          ) : null
        }
        action={
          <ClientRefreshButton
            onClick={() => {
              void loadOverview(true);
              void loadUpgradeRequests(true);
            }}
            loading={loading}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ClientStatTile
          label="Hiring manager seats"
          value={summary ? `${summary.seats.used}/${summary.seats.limit}` : "…"}
          detail={
            summary
              ? `${summary.seats.available} seat${summary.seats.available === 1 ? "" : "s"} available`
              : "Loading seat capacity…"
          }
          icon={Users}
        />
        <ClientStatTile
          label="Available invites"
          value={summary?.availableAccessCodes ?? "…"}
          detail="Unused hiring-manager invite codes"
          icon={KeyRound}
        />
        <ClientStatTile
          label="Campaign approvals"
          value={summary?.campaignsPendingApproval ?? pendingCampaigns.length}
          detail="Campaigns waiting for your review"
          icon={ClipboardCheck}
        />
        <ClientStatTile
          label="Candidates pending review"
          value={summary?.candidatesPendingReview ?? pendingSharedCandidates.length}
          detail="Shared candidates awaiting a decision"
          icon={UserCheck}
        />
      </div>

      <PortalDecisionLedger
        description="Decisions that currently require a client response."
        loading={loading && !summary}
        items={attentionItems.map((item) => ({
          id: item.href,
          title: item.label,
          detail: item.description,
          href: item.href,
          count: item.count,
        }))}
        emptyDescription="Campaign approvals and candidate reviews are up to date."
      />
    </div>
  );
}
