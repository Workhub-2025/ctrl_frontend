"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  MapPin,
  RefreshCw,
  Users,
} from "lucide-react";
import { getAssessmentCatalogueIcon } from "@/assessments/plugins/display";
import { SharedCandidateNotesPanel } from "@/components/dashboard/shared-candidate-notes-panel";
import { ClientErrorBanner, ClientPageHeader } from "@/components/dashboard/client/client-portal-ui";
import { usePortalBreadcrumbDetail } from "@/components/dashboard/portal/portal-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ClientCampaignWorkspace, ClientSharedCandidate } from "@/services/client-portal.service";

const OUTCOME_LABELS: Record<ClientSharedCandidate["reviewStatus"], string> = {
  pending_review: "Pending review",
  reviewed: "Reviewed",
  progressed: "Progressed",
  hired: "Hired",
  rejected: "Rejected",
};

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(value));
}

export function ClientCampaignDetail({ campaignId }: { campaignId: string }) {
  const [campaign, setCampaign] = useState<ClientCampaignWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  usePortalBreadcrumbDetail(campaign?.name);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/client/campaigns/${encodeURIComponent(campaignId)}`, {
        cache: "no-store",
      });
      const body = (await response.json().catch(() => ({}))) as {
        data?: ClientCampaignWorkspace;
        error?: string;
      };
      if (!response.ok || !body.data) throw new Error(body.error || "Campaign could not be loaded");
      setCampaign(body.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Campaign could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !campaign) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
        Loading campaign…
      </p>
    );
  }

  if (!campaign) {
    return <ClientErrorBanner message={error || "Campaign could not be found."} />;
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" className="min-h-11 rounded-md" asChild>
        <Link href="/client-dashboard/campaigns">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
          Back to campaigns
        </Link>
      </Button>

      <ClientPageHeader
        title={campaign.name}
        description={`${campaign.role} · Created by ${campaign.createdBy}`}
        notice={error ? <ClientErrorBanner message={error} /> : null}
        action={
          <Button variant="outline" className="min-h-11 rounded-md" onClick={() => void load()}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2" aria-label="Campaign status">
        <Badge variant="outline">{campaign.approvalStatus}</Badge>
        <Badge variant="outline">{campaign.status}</Badge>
        <Badge variant="outline">{campaign.deliveryMode}</Badge>
      </div>

      <Tabs defaultValue="overview" className="space-y-5">
        <TabsList className="h-auto min-h-11 w-full justify-start overflow-x-auto rounded-md bg-muted p-1">
          <TabsTrigger value="overview" className="min-h-10 gap-2"><ClipboardList className="h-4 w-4" aria-hidden="true" />Overview</TabsTrigger>
          <TabsTrigger value="assessments" className="min-h-10">Assessments</TabsTrigger>
          <TabsTrigger value="sessions" className="min-h-10">Sessions <span className="tabular-nums">{campaign.sessionsDetail.length}</span></TabsTrigger>
          <TabsTrigger value="candidates" className="min-h-10">Shared candidates <span className="tabular-nums">{campaign.sharedCandidates.length}</span></TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="rounded-md border border-border bg-card p-5">
          <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start</dt><dd className="mt-1 text-sm text-foreground">{formatDate(campaign.startDate)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">End</dt><dd className="mt-1 text-sm text-foreground">{campaign.endDate ? formatDate(campaign.endDate) : "Ongoing"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Location</dt><dd className="mt-1 flex items-center gap-2 text-sm text-foreground"><MapPin className="h-4 w-4 text-muted-foreground" aria-hidden="true" />{campaign.location || "Not set"}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vacancies</dt><dd className="mt-1 text-sm tabular-nums text-foreground">{campaign.vacancyCount ?? "Not set"}</dd></div>
          </dl>
          <p className="mt-6 border-l-2 border-primary pl-4 text-sm leading-6 text-muted-foreground">
            Candidate information remains private until a hiring manager explicitly shares a reviewed candidate with your organisation.
          </p>
        </TabsContent>

        <TabsContent value="assessments" className="space-y-3">
          {campaign.assessmentStack.map((assessment) => {
            const Icon = getAssessmentCatalogueIcon(assessment);
            return (
              <div key={assessment} className="flex items-center gap-3 rounded-md border border-border bg-card p-4">
                <span className="grid h-10 w-10 place-items-center rounded-md border border-border bg-muted text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <div><p className="font-semibold text-foreground">{assessment}</p><p className="text-xs text-muted-foreground">Campaign configuration applied</p></div>
              </div>
            );
          })}
        </TabsContent>

        <TabsContent value="sessions" className="space-y-3">
          {campaign.sessionsDetail.length === 0 ? <p className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">No sessions have been created for this campaign.</p> : campaign.sessionsDetail.map((session) => (
            <article key={session.documentId} className="rounded-md border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-foreground">{session.name}</h2><p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4" aria-hidden="true" />{formatDate(session.startsAt)}</p></div><Badge variant="outline">{session.sessionStatus}</Badge></div>
            </article>
          ))}
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4">
          {campaign.sharedCandidates.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center"><Users className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" /><p className="mt-2 font-semibold text-foreground">No candidates have been shared</p><p className="mt-1 text-sm text-muted-foreground">This does not reveal invitation, start or completion totals.</p></div>
          ) : campaign.sharedCandidates.map((candidate) => (
            <article key={candidate.documentId} className="rounded-md border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold text-foreground">{candidate.candidateName}</h2><p className="text-sm text-muted-foreground">{candidate.candidateEmail}</p><p className="mt-1 text-xs text-muted-foreground">Shared by {candidate.hiringManagerName}</p></div><Badge variant="outline" className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />{OUTCOME_LABELS[candidate.reviewStatus]}</Badge></div>
              <SharedCandidateNotesPanel sharedCandidateDocumentId={candidate.documentId} portal="client" className="mt-4" />
            </article>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
