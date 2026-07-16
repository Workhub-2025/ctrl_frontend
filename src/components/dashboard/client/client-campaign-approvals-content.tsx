"use client";

import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, FolderKanban, RefreshCw, XCircle } from "lucide-react";
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
    campaigns,
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
        title="Campaigns"
        description="Review every campaign created for your organisation and open its operational workspace."
        notice={error ? <ClientErrorBanner message={error} /> : null}
        action={
          <ClientRefreshButton onClick={() => void loadOverview(true)} loading={loading} />
        }
      />

      <PortalPanel>
        <div className="space-y-6 p-6">
          <PortalSectionHeader
            eyebrow="Campaign register"
            title="All campaigns"
            description="Approval, assessment and session information stays together. Candidate data appears only after a hiring manager shares it."
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

          {!loading && campaigns.length === 0 && (
            <PortalEmptyState
              icon={FolderKanban}
              title="No campaigns yet"
              description="Campaigns created for your organisation will appear here."
            />
          )}

          {!loading &&
            campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className={cn(portalCardClass, "p-5")}
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn("rounded-md px-2.5 py-0.5 font-semibold", portalBadgeClass)}>
                        {campaign.approvalStatus}
                      </Badge>
                      <Badge variant="outline" className="rounded-lg px-2.5 py-0.5 text-xs">
                        {campaign.deliveryMode}
                      </Badge>
                      <Badge variant="outline" className="rounded-lg px-2.5 py-0.5 text-xs">
                        {campaign.candidateCount} vacancies
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
                    <div className="rounded-md border border-border bg-muted/40 p-4">
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
                              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground"
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

                  <div className="flex flex-col justify-between gap-4 rounded-md border border-border bg-muted/40 p-4">
                    {campaign.approvalStatus === "Pending approval" ? (
                      <>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <AlertCircle className="h-4 w-4 text-primary" aria-hidden="true" />
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
                        className="min-h-11 gap-2 rounded-md font-semibold"
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        disabled={reviewingId === campaign.id}
                        onClick={() => void reviewCampaign(campaign.id, "rejected")}
                        className="min-h-11 gap-2 rounded-md font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <XCircle className="h-4 w-4" aria-hidden="true" />
                        Reject
                      </Button>
                      </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-foreground">{campaign.nextMilestone}</p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          Open the campaign to review its assessments, sessions and shared candidates.
                        </p>
                      </div>
                    )}
                    <Button variant="outline" className="min-h-11 justify-between rounded-md" asChild>
                      <Link href={`/client-dashboard/campaigns/${encodeURIComponent(campaign.id)}`}>
                        View campaign
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </PortalPanel>
    </div>
  );
}
