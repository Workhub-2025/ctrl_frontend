"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, RefreshCw, Trash2 } from "lucide-react";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignDetail,
} from "@/services/hiring-manager-portal-client.service";

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

  const loadCampaign = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await HiringManagerPortalClientService.getCampaignDetail(campaignId);
      setCampaign(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Campaign could not be loaded."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getCandidateCompletion = (
    candidate: HiringManagerCampaignDetail["joinedCandidates"][number]
  ) => {
    const totalAssessments = Math.max(
      candidate.assessmentStack?.length ?? campaign?.assessmentStack.length ?? 0,
      candidate.results?.length ?? 0,
      1
    );
    const completedAssessments = candidate.results?.filter(
      (result) => result.completedAt || result.numericScore !== null
    ).length ?? 0;
    return {
      completedAssessments,
      totalAssessments,
      completion: Math.round((completedAssessments / totalAssessments) * 100),
    };
  };

  useEffect(() => {
    void loadCampaign();
  }, [campaignId]);

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

      <div className="grid gap-4 lg:grid-cols-4">
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
        <Card className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Joined candidates</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {campaign.joinedCandidates.length}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
          <CardContent className="p-4">
            <p className="text-xs uppercase text-slate-500">Completion</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {campaign.completion}%
            </p>
            <Progress value={campaign.completion} className="mt-3 h-2 bg-white/10" />
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
                className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3 md:grid-cols-[minmax(0,1fr)_220px]"
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
                <div className="rounded-md border border-white/10 bg-[#08101d] p-3 text-sm text-slate-300">
                  {session.candidateCount} of {session.candidateLimit} candidates joined
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
        <CardHeader className="border-b border-white/10 p-4">
          <CardTitle className="text-base text-white">Joined candidates</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 md:grid-cols-2">
          {campaign.joinedCandidates.length === 0 ? (
            <p className="text-sm text-slate-400">No candidates have joined yet.</p>
          ) : (
            campaign.joinedCandidates.map((candidate) => {
              const completion = getCandidateCompletion(candidate);
              return (
                <div
                  key={candidate.id}
                  className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-white">
                        {candidate.name}
                      </p>
                      <p className="mt-1 break-words text-xs text-slate-500">
                        {candidate.email || candidate.status || "Joined"} · {candidate.sessionName}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="h-8 shrink-0 rounded-md border-white/10 bg-[#08101d] px-2.5 text-xs text-slate-100 hover:bg-white/[0.05]"
                      asChild
                    >
                      <Link href={`/hiring-manager-dashboard/candidates/${candidate.id}/`}>
                        Candidate view
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                  <div className="mt-3 rounded-md border border-white/10 bg-[#08101d] p-3">
                    <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
                      <span>Completed assessments</span>
                      <span className="font-medium text-white">
                        {completion.completedAssessments}/{completion.totalAssessments}
                      </span>
                    </div>
                    <Progress value={completion.completion} className="mt-3 h-2 bg-white/10" />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
