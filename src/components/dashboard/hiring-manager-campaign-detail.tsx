"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Eye,
  RefreshCw,
  Trash2,
  Keyboard,
  ClipboardList,
  BrainCircuit,
  PhoneCall,
  FileQuestion,
  Users,
  Calendar,
  Briefcase
} from "lucide-react";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { cn } from "@/lib/utils";
import {
  CandidateResultsDialog,
  HiringManagerSessionDetailsDialog,
  type ResultsDialogState,
} from "@/components/dashboard/hiring-manager-session-details-dialog";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignDetail,
} from "@/services/hiring-manager-portal-client.service";

type CampaignSession = HiringManagerCampaignDetail["assessmentSessions"][number];

type HiringManagerCampaignDetailProps = {
  campaignId: string;
};

function getAssessmentVersionSummary(settings?: Record<string, unknown> | null) {
  if (!settings || typeof settings !== "object") return [];

  return Object.entries(settings)
    .filter(([key, value]) => key !== "weights" && value && typeof value === "object")
    .map(([key, value]) => {
      const config = value as { version?: unknown; difficulty?: unknown; scoringMode?: unknown };
      const label = key.replace(/-/g, " ");
      const detail = [
        config.difficulty ? String(config.difficulty) : null,
        config.scoringMode ? `${String(config.scoringMode)} scoring` : null,
      ].filter(Boolean).join(" · ");
      return {
        key,
        label: `${label} v${String(config.version ?? "1.0.0")}`,
        detail,
      };
    });
}

export function HiringManagerCampaignDetailView({
  campaignId,
}: HiringManagerCampaignDetailProps) {
  const router = useRouter();
  const [campaign, setCampaign] = useState<HiringManagerCampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [removingCandidateId, setRemovingCandidateId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<CampaignSession | null>(null);
  const [selectedReport, setSelectedReport] = useState<ResultsDialogState | null>(null);

  const loadCampaign = useCallback(async (force = false) => {
    const startTime = Date.now();
    if (!force) setIsLoading(true);
    else setIsRefreshing(true);
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
      if (force) {
        const elapsedTime = Date.now() - startTime;
        const minSpin = 800; // ms to ensure smooth spin
        if (elapsedTime < minSpin) {
          await new Promise((resolve) => setTimeout(resolve, minSpin - elapsedTime));
        }
      }
      setIsLoading(false);
      setIsRefreshing(false);
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
          className="h-9 rounded-md border-white/10 bg-white/[0.02] px-3 text-sm text-slate-100 hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors"
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
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          className="h-8 rounded-lg border-white/10 bg-white/[0.02] px-3 text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white"
          asChild
        >
          <Link href="/hiring-manager-dashboard/campaigns/">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to campaigns
          </Link>
        </Button>
      </div>

      <HiringManagerPageHeader
        eyebrow={`Campaign Workspace // ${campaign.deliveryMode}`}
        title={campaign.name}
        description={`${campaign.role} · ${campaign.location}`}
        icon={Briefcase}
        badge={
          <Badge className={cn("pointer-events-none rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border-none", getStatusTone(campaign.status))}>
            {campaign.status}
          </Badge>
        }
        notice={
          error ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-relaxed text-red-200">
              {error}
            </p>
          ) : null
        }
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => void loadCampaign(true)}
              disabled={isRefreshing}
              className="h-9 border-white/10 bg-white/[0.02] text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white"
            >
              <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", isRefreshing && "animate-spin text-primary")} />
              Refresh
            </Button>
            <Button
              type="button"
              onClick={deleteCampaign}
              disabled={isDeleting}
              className="h-9 rounded-lg bg-red-500/10 border border-red-500/20 px-3.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              {isDeleting ? "Deleting..." : "Delete Campaign"}
            </Button>
          </div>
        }
      />

      <div className="w-full">
        <Card className="relative overflow-hidden rounded-xl border border-white/10 bg-[#0b1329]/40 backdrop-blur-md hover:border-primary/45 transition-colors duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500 to-sky-400" />
          <CardContent className="p-5 flex flex-col justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-indigo-400" /> Active Assessment Sessions
            </p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{campaign.sessions}</span>
              <span className="text-xs text-slate-500">scheduled events</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.9fr]">
        <Card className="rounded-2xl border border-border/50 bg-card/40 dark:border-white/5 dark:bg-[#0b1329]/25 shadow-sm backdrop-blur-md">
          <CardHeader className="border-b border-border/40 dark:border-white/5 p-4">
            <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="h-4 w-4 text-primary" /> Assessment stack
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 p-4">
            {campaign.assessmentStack.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No assessments linked.</p>
            ) : (
              campaign.assessmentStack.map((assessment) => {
                const Icon = getAssessmentIcon(assessment);
                return (
                  <span
                    key={assessment}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border/55 bg-muted/40 px-3 py-1.5 text-xs font-semibold text-slate-200 dark:border-white/5 dark:bg-white/[0.02]"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {assessment}
                  </span>
                );
              })
            )}
            {getAssessmentVersionSummary(campaign.assessmentSettings).map((item) => (
              <span
                key={item.key}
                className="inline-flex items-center rounded-lg border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-semibold capitalize text-primary"
                title={item.detail || undefined}
              >
                {item.label}
              </span>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/50 bg-card/40 dark:border-white/5 dark:bg-[#0b1329]/25 shadow-sm backdrop-blur-md">
          <CardHeader className="border-b border-border/40 dark:border-white/5 p-4">
            <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" /> Campaign Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3.5 p-4 text-xs text-slate-300">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="text-slate-500">Start Date</span>
              <span className="font-semibold text-white">{campaign.startDate}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">End Date</span>
              <span className="font-semibold text-white">{campaign.endDate}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl border border-white/10 bg-[#0b1329]/45 backdrop-blur-md shadow-lg">
        <CardHeader className="border-b border-white/10 p-4">
          <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {campaign.assessmentSessions.length === 0 ? (
            <p className="text-xs text-slate-500 italic">
              No sessions created yet. Create sessions from the Sessions tab.
            </p>
          ) : (
            campaign.assessmentSessions.map((session) => (
              <div
                key={session.id}
                className="grid gap-3 rounded-lg border border-white/10 bg-[#0b1329]/20 p-4 md:grid-cols-[minmax(0,1fr)_auto] items-center hover:border-primary/20 transition-all duration-300"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={[
                      "rounded-md border-none text-[10px] font-semibold px-2 py-0.5",
                      getStatusTone(session.status)
                    ].join(" ")}>
                      {session.status}
                    </Badge>
                    <span className="break-all text-sm font-semibold text-white">
                      {session.accessValue}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {session.date} · {session.location}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 rounded-lg border-white/10 bg-white/[0.02] px-3.5 text-xs text-slate-200 hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors"
                  onClick={() => setSelectedSession(session)}
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  View details
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Candidates in Campaign Section */}
      <Card className="rounded-xl border border-white/10 bg-[#0b1329]/45 backdrop-blur-md shadow-2xl">
        <CardHeader className="border-b border-white/10 p-5 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Candidates in Campaign ({campaign.joinedCandidates.length})
          </CardTitle>
          <Badge className="pointer-events-none bg-indigo-500/10 text-indigo-400 border-none px-2.5 py-0.5 text-xs font-semibold">
            Real-time assessment results
          </Badge>
        </CardHeader>
        <CardContent className="p-5">
          {campaign.joinedCandidates.length === 0 ? (
            <p className="text-xs text-slate-500 italic text-center py-6">
              No candidates have joined sessions for this campaign yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-white/10 bg-[#080c16]/30">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="p-3">Candidate</th>
                    <th className="p-3">Session</th>
                    <th className="p-3">Assessments Progress</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {campaign.joinedCandidates.map((candidate) => {
                    const results = candidate.results ?? [];
                    const totalCount = Math.max(
                      candidate.assessmentStack?.length ?? campaign.assessmentStack.length,
                      results.length,
                      1
                    );
                    const completedCount = results.filter(
                      (r) => r.completedAt || r.numericScore !== null
                    ).length;
                    const completionPercent = Math.round((completedCount / totalCount) * 100);
                    const progressStatus =
                      completedCount >= totalCount
                        ? "completed"
                        : completedCount > 0
                          ? "in_progress"
                          : "not_started";

                    return (
                      <tr key={candidate.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="p-3">
                          <div className="font-semibold text-white">{candidate.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{candidate.email}</div>
                        </td>
                        <td className="p-3 text-slate-300">
                          {candidate.sessionName ?? "Main Session"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3 max-w-[200px]">
                            <div className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className={[
                                  "h-full rounded-full transition-all duration-300",
                                  progressStatus === "completed"
                                    ? "bg-emerald-400"
                                    : progressStatus === "in_progress"
                                      ? "bg-orange-400"
                                      : "bg-slate-500"
                                ].join(" ")}
                                style={{ width: `${completionPercent}%` }}
                              />
                            </div>
                            <span className="font-semibold shrink-0 text-slate-300">
                              {completedCount}/{totalCount}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setSelectedReport({
                                candidateId: candidate.id,
                                campaignId: campaign.id,
                                candidateSessionId: candidate.id,
                                candidateName: candidate.name,
                                candidateEmail: candidate.email,
                                role: campaign.role,
                                campaignName: campaign.name,
                              })
                            }
                            className="h-8 text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                          >
                            View report
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <HiringManagerSessionDetailsDialog
        session={selectedSession}
        open={Boolean(selectedSession)}
        onOpenChange={(open) => !open && setSelectedSession(null)}
        campaignName={campaign.name}
        campaignRole={campaign.role}
        campaignId={campaign.id}
        expectedAssessmentCount={campaign.assessmentStack.length}
        removingCandidateId={removingCandidateId}
        onKickCandidate={removeCandidate}
        getResultsHref={(candidate) =>
          `/hiring-manager-dashboard/candidates/${candidate.id}/?campaignId=${campaign.id}&candidateSessionId=${candidate.id}`
        }
        assessmentStack={campaign.assessmentStack}
      />

      <CandidateResultsDialog
        resultsDialog={selectedReport}
        onClose={() => setSelectedReport(null)}
      />
    </div>
  );
}

function getAssessmentIcon(name: string) {
  const lowercase = name.toLowerCase();
  if (lowercase.includes("typing")) {
    return Keyboard;
  }
  if (lowercase.includes("prioriti") || lowercase.includes("order")) {
    return ClipboardList;
  }
  if (lowercase.includes("judgement") || lowercase.includes("sjt") || lowercase.includes("behavior")) {
    return BrainCircuit;
  }
  if (lowercase.includes("call") || lowercase.includes("audio") || lowercase.includes("simulat")) {
    return PhoneCall;
  }
  return FileQuestion;
}
