"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, RefreshCw, Trash2 } from "lucide-react";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import { HiringManagerSessionDetailsDialog } from "@/components/dashboard/hiring-manager-session-details-dialog";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignDetail,
} from "@/services/hiring-manager-portal-client.service";

type CampaignSession = HiringManagerCampaignDetail["assessmentSessions"][number];

type HiringManagerCampaignDetailProps = {
  campaignId: string;
};

export function HiringManagerCampaignDetailView({
  campaignId,
}: HiringManagerCampaignDetailProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<HiringManagerCampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removingCandidateId, setRemovingCandidateId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<CampaignSession | null>(null);

  const loadCampaign = useCallback(async (force = false) => {
    if (!force) setIsLoading(true);
    setError(null);
    try {
      const data = await HiringManagerPortalClientService.getCampaignDetail(campaignId, { force });
      setCampaign(data);
      setSelectedSession((current) =>
        current
          ? data?.assessmentSessions.find((session) => session.id === current.id) ?? null
          : null
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Campaign could not be loaded."
      );
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

  const deleteCampaign = async () => {
    if (!campaign) return;

    const confirmed = window.confirm(
      `Delete "${campaign.name}"? This will remove the campaign, its sessions, and candidate application records linked to it.`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);
    try {
      await HiringManagerPortalClientService.deleteCampaign(campaignId);
      router.push("/hiring-manager-dashboard/campaigns/");
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Campaign could not be deleted."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const removeCandidate = async (sessionId: string, candidateSessionId: string) => {
    const confirmed = window.confirm(
      "Kick this candidate from the session? They will need a fresh invite to rejoin."
    );
    if (!confirmed) return;

    setRemovingCandidateId(candidateSessionId);
    setError(null);
    try {
      await HiringManagerPortalClientService.removeCandidateFromSession({
        sessionId,
        candidateSessionId,
        reason: "Removed by hiring manager",
      });
      await loadCampaign(true);
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Candidate could not be removed from the session."
      );
    } finally {
      setRemovingCandidateId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#0b1220] p-6 text-sm text-slate-300">
        Loading campaign...
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          className="h-9 rounded-md border-white/10 bg-white/[0.02] px-3 text-sm text-slate-100 hover:bg-white/[0.05]"
          asChild
        >
          <Link href="/hiring-manager-dashboard/campaigns/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to campaigns
          </Link>
        </Button>
        <div className="rounded-lg border border-red-400/20 bg-red-400/10 p-6 text-sm text-red-100">
          {error || "Campaign could not be loaded."}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-6">
      <section className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <Button
            variant="outline"
            className="h-9 rounded-md border-white/10 bg-white/[0.02] px-3 text-sm text-slate-100 hover:bg-white/[0.05]"
            asChild
          >
            <Link href="/hiring-manager-dashboard/campaigns/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={getStatusTone(campaign.status)}>{campaign.status}</Badge>
            <Badge className="rounded-md border-white/10 bg-white/[0.03] text-xs text-slate-300 hover:bg-white/[0.03]">
              {campaign.deliveryMode}
            </Badge>
          </div>
          <div>
            <h1 className="break-words text-xl font-semibold leading-7 text-white sm:text-2xl">
              {campaign.name}
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              {campaign.role} · {campaign.location}
            </p>
          </div>
          {error && (
            <p className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-100">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={loadCampaign}
            className="h-9 rounded-md border-white/10 bg-white/[0.02] px-3 text-sm text-slate-100 hover:bg-white/[0.05]"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            type="button"
            disabled={isDeleting}
            onClick={deleteCampaign}
            className="h-9 rounded-md bg-red-500 px-3 text-sm font-medium text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete campaign"}
          </Button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Expected candidates</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {campaign.candidateCount}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Sessions</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {campaign.sessions}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Card className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
          <CardHeader className="border-b border-white/10 p-4">
            <CardTitle className="text-base text-white">Assessment stack</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 p-4">
            {campaign.assessmentStack.length === 0 ? (
              <p className="text-sm text-slate-400">No assessments linked.</p>
            ) : (
              campaign.assessmentStack.map((assessment) => (
                <span
                  key={assessment}
                  className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300"
                >
                  {assessment}
                </span>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
          <CardHeader className="border-b border-white/10 p-4">
            <CardTitle className="text-base text-white">Dates</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-4 text-sm text-slate-300">
            <p>Start: {campaign.startDate}</p>
            <p>End: {campaign.endDate}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
        <CardHeader className="border-b border-white/10 p-4">
          <CardTitle className="text-base text-white">Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {campaign.assessmentSessions.length === 0 ? (
            <p className="text-sm text-slate-400">
              No sessions created yet. Create sessions from the Sessions tab.
            </p>
          ) : (
            campaign.assessmentSessions.map((session) => (
              <div
                key={session.id}
                className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={getStatusTone(session.status)}>
                      {session.status}
                    </Badge>
                    <span className="break-all text-sm font-semibold text-white">
                      {session.accessValue}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {session.date} · {session.location}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-9 rounded-md border-white/10 bg-[#08101d] px-3 text-sm text-slate-100 hover:bg-white/[0.05]"
                  onClick={() => setSelectedSession(session)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View session details
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <HiringManagerSessionDetailsDialog
        session={selectedSession}
        open={Boolean(selectedSession)}
        onOpenChange={(open) => !open && setSelectedSession(null)}
        campaignName={campaign.name}
        expectedAssessmentCount={campaign.assessmentStack.length}
        removingCandidateId={removingCandidateId}
        onKickCandidate={removeCandidate}
        getResultsHref={(candidate) =>
          `/hiring-manager-dashboard/candidates/${candidate.id}/?campaignId=${campaign.id}&candidateSessionId=${candidate.id}`
        }
      />
    </div>
  );
}
