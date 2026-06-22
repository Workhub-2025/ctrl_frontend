"use client";

import { AlertCircle, CheckCircle2, ClipboardCheck, RefreshCw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { getAssessmentCatalogueIcon } from "@/assessments/plugins/display";
import { getAssessmentSettingSummary } from "@/components/dashboard/client/client-portal-utils";
import {
  ClientErrorBanner,
  ClientPageHeader,
  ClientRefreshButton,
} from "@/components/dashboard/client/client-portal-ui";
import {
  PortalEmptyState,
  PortalPanel,
  PortalSectionHeader,
  portalBadgeClass,
} from "@/components/dashboard/portal/portal-ui";
import { portalCardClass, portalPanelClass } from "@/components/dashboard/portal/portal-design-tokens";
import { useClientPortal } from "@/context/client-portal-provider";
import { cn } from "@/lib/utils";

function ApprovalModeControl({
  mode,
  disabled,
  onChange,
}: {
  mode: "auto_approve" | "require_approval";
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const isAutoApprove = mode === "auto_approve";

  return (
    <div className={cn(portalPanelClass, "w-full p-4 lg:w-[320px]")}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {isAutoApprove ? "Auto approve campaigns" : "Client reviews campaigns"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Applies to campaigns created after this setting changes.
          </p>
        </div>
        <Switch
          checked={isAutoApprove}
          disabled={disabled}
          onCheckedChange={onChange}
          aria-label="Toggle campaign auto approval"
        />
      </div>
    </div>
  );
}

export function ClientCampaignApprovalsContent() {
  const {
    summary,
    pendingCampaigns,
    loading,
    error,
    reviewingId,
    approvalModeBusy,
    loadOverview,
    reviewCampaign,
    updateApprovalMode,
  } = useClientPortal();

  return (
    <div className="relative mx-auto max-w-7xl space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <ClientPageHeader
        title="Campaign approvals"
        description="Review hiring-manager campaigns before sessions can be created."
        notice={error ? <ClientErrorBanner message={error} /> : null}
        action={
          <ClientRefreshButton onClick={() => void loadOverview(true)} loading={loading} />
        }
      />

      <PortalPanel>
        <div className="space-y-6 p-6">
          <PortalSectionHeader
            eyebrow="Campaign queue"
            title="Pending campaigns"
            description="Approve or reject campaigns submitted by your hiring managers."
            action={
              <ApprovalModeControl
                mode={summary?.client?.campaignApprovalMode ?? "require_approval"}
                disabled={loading || approvalModeBusy || !summary?.client?.documentId}
                onChange={(checked) => void updateApprovalMode(checked)}
              />
            }
          />

          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 motion-safe:animate-spin text-primary" aria-hidden="true" />
              Loading campaign approvals…
            </p>
          )}

          {!loading && pendingCampaigns.length === 0 && (
            <PortalEmptyState
              icon={ClipboardCheck}
              title="No pending campaigns"
              description="No campaigns are waiting for your approval."
            />
          )}

          {!loading &&
            pendingCampaigns.map((campaign) => (
              <div
                key={campaign.id}
                className={cn(portalCardClass, "p-5")}
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-lg border-orange-500/20 bg-orange-500/10 px-2.5 py-0.5 font-semibold text-orange-600 hover:bg-orange-500/10 dark:text-orange-400">
                        Pending approval
                      </Badge>
                      <Badge variant="outline" className="rounded-lg px-2.5 py-0.5 text-xs">
                        {campaign.deliveryMode}
                      </Badge>
                      <Badge variant="outline" className="rounded-lg px-2.5 py-0.5 text-xs">
                        {campaign.candidateCount} candidates
                      </Badge>
                    </div>
                    <div className="min-w-0 space-y-1">
                      <h2 className="break-words font-display text-lg font-semibold text-foreground">
                        {campaign.name}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {campaign.role} · Created by {campaign.createdBy}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-card/60 p-4 shadow-inner dark:border-white/5 dark:bg-[#04070d]/50">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Assessment stack
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {campaign.assessmentStack.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No assessments attached</span>
                        ) : (
                          campaign.assessmentStack.map((assessment) => {
                            const Icon = getAssessmentCatalogueIcon(assessment);
                            return (
                            <span
                              key={assessment}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground dark:border-white/5 dark:bg-white/[0.04]"
                            >
                              <Icon className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                              {assessment}
                            </span>
                            );
                          })
                        )}
                      </div>
                      {getAssessmentSettingSummary(campaign.assessmentSettings).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {getAssessmentSettingSummary(campaign.assessmentSettings).map((item) => (
                            <span
                              key={item.key}
                              className="rounded-lg border border-primary/15 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold text-primary"
                              title={item.detail || undefined}
                            >
                              {item.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card/60 p-4 shadow-inner dark:border-white/5 dark:bg-[#04070d]/50">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <AlertCircle className="h-4 w-4 text-orange-500" aria-hidden="true" />
                        Review required
                      </div>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Approving unlocks session creation for this campaign.
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Button
                        disabled={reviewingId === campaign.id}
                        onClick={() => void reviewCampaign(campaign.id, "approved")}
                        className="gap-2 rounded-xl font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        disabled={reviewingId === campaign.id}
                        onClick={() => void reviewCampaign(campaign.id, "rejected")}
                        className="gap-2 rounded-xl border-red-500/20 bg-transparent font-semibold text-red-500 transition-colors hover:!border-red-500/50 hover:!bg-red-500/10 hover:!text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </PortalPanel>
    </div>
  );
}
