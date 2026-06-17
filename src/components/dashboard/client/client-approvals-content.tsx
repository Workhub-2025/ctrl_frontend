"use client";

import { useEffect } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  RefreshCw,
  UserCheck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { portalPanelClass } from "@/components/dashboard/portal/portal-design-tokens";
import { useClientPortal } from "@/context/client-portal-provider";
import type { ClientSharedCandidate } from "@/services/client-portal.service";
import { cn } from "@/lib/utils";

const REVIEW_STATUS_LABELS: Record<ClientSharedCandidate["reviewStatus"], string> = {
  pending_review: "Pending review",
  reviewed: "Reviewed",
  progressed: "Progressed",
  rejected: "Rejected",
};

function ReviewStatusBadge({ status }: { status: ClientSharedCandidate["reviewStatus"] }) {
  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-semibold", portalBadgeClass)}>
      {REVIEW_STATUS_LABELS[status]}
    </Badge>
  );
}

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
    <div className={cn(portalPanelClass, "w-full p-4 sm:w-[320px]")}>
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

export function ClientApprovalsContent() {
  const {
    summary,
    pendingCampaigns,
    sharedCandidates,
    loading,
    sharedLoading,
    error,
    reviewingId,
    approvalModeBusy,
    loadOverview,
    loadSharedCandidates,
    reviewCampaign,
    updateApprovalMode,
  } = useClientPortal();

  useEffect(() => {
    void loadSharedCandidates();
  }, [loadSharedCandidates]);

  return (
    <div className="relative mx-auto max-w-7xl space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <ClientPageHeader
        title="Approvals"
        description="Review campaign submissions and candidates recommended by your hiring managers."
        notice={error ? <ClientErrorBanner message={error} /> : null}
        action={
          <ClientRefreshButton
            onClick={() => {
              void loadOverview(true);
              void loadSharedCandidates();
            }}
            loading={loading || sharedLoading}
          />
        }
      />

      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList className="h-11 rounded-xl bg-muted/60 p-1">
          <TabsTrigger value="campaigns" className="rounded-lg px-4 text-sm font-semibold">
            Campaign approvals
            {pendingCampaigns.length > 0 ? (
              <Badge className={cn("ml-2 rounded-full px-2 py-0 text-[10px]", portalBadgeClass)}>
                {pendingCampaigns.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="candidates" className="rounded-lg px-4 text-sm font-semibold">
            Approved candidates
            {sharedCandidates.filter((c) => c.reviewStatus === "pending_review").length > 0 ? (
              <Badge className={cn("ml-2 rounded-full px-2 py-0 text-[10px]", portalBadgeClass)}>
                {sharedCandidates.filter((c) => c.reviewStatus === "pending_review").length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-0 space-y-4">
          <PortalPanel>
            <div className="space-y-6 p-6">
              <PortalSectionHeader
                eyebrow="Campaign queue"
                title="Campaign approval queue"
                description="Choose whether new campaigns need client review before sessions can be created."
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
                    className={cn(portalPanelClass, "p-5 shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-primary/30")}
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
                              campaign.assessmentStack.map((assessment) => (
                                <span
                                  key={assessment}
                                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground dark:border-white/5 dark:bg-white/[0.04]"
                                >
                                  {assessment}
                                </span>
                              ))
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
        </TabsContent>

        <TabsContent value="candidates" className="mt-0 space-y-4">
          <PortalPanel>
            <div className="space-y-6 p-6">
              <PortalSectionHeader
                eyebrow="Candidate review"
                title="Approved candidates"
                description="Hiring managers recommend candidates here after assessment review. This list is for your visibility — no further approval is required."
              />

              {sharedLoading && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 motion-safe:animate-spin text-primary" aria-hidden="true" />
                  Loading approved candidates…
                </p>
              )}

              {!sharedLoading && sharedCandidates.length === 0 && (
                <PortalEmptyState
                  icon={UserCheck}
                  title="No approved candidates yet"
                  description="When a hiring manager passes a candidate, they will appear here for your records."
                />
              )}

              {!sharedLoading && sharedCandidates.length > 0 && (
                <ul className="space-y-4">
                  {sharedCandidates.map((candidate) => (
                    <li
                      key={candidate.documentId}
                      className="rounded-xl border border-border/60 bg-background/30 p-5 shadow-sm dark:border-white/5 dark:bg-[#0b1220]/25"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <ReviewStatusBadge status={candidate.reviewStatus} />
                            <Badge variant="outline" className="rounded-lg text-xs">
                              {candidate.campaignName}
                            </Badge>
                          </div>
                          <div>
                            <p className="font-display text-base font-semibold text-foreground">
                              {candidate.candidateName}
                            </p>
                            {candidate.candidateEmail ? (
                              <p className="text-sm text-muted-foreground">{candidate.candidateEmail}</p>
                            ) : null}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {candidate.role} · Recommended by {candidate.hiringManagerName}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </PortalPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}
