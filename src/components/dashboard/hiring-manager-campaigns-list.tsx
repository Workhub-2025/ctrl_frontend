"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  RefreshCw,
  Keyboard,
  ClipboardList,
  BrainCircuit,
  PhoneCall,
  FileQuestion,
  Target,
  Users,
  CalendarDays,
  Layers3,
  Plus,
  Check,
  Copy,
  Eye,
  Play,
  Building,
  Globe,
  KeyRound,
  AlertCircle,
} from "lucide-react";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import { HiringManagerSessionDetailsDialog } from "@/components/dashboard/hiring-manager-session-details-dialog";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignListItem,
  type HiringManagerSessionListItem,
  type HiringManagerCampaignDetail,
} from "@/services/hiring-manager-portal-client.service";

function formatLastRefresh(value: number | null) {
  if (!value) return "Not refreshed yet";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function HiringManagerCampaignsList() {
  const [campaigns, setCampaigns] = useState<HiringManagerCampaignListItem[]>([]);
  const [sessions, setSessions] = useState<HiringManagerSessionListItem[]>([]);
  const [campaignDetails, setCampaignDetails] = useState<HiringManagerCampaignDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(
    HiringManagerPortalClientService.getSessionsLastRefresh()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // States for the details drawer & actions
  const [selectedSession, setSelectedSession] = useState<HiringManagerSessionListItem | null>(null);
  const [updatingSessionId, setUpdatingSessionId] = useState<string | null>(null);
  const [unlockingCandidateId, setUnlockingCandidateId] = useState<string | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [removingCandidateId, setRemovingCandidateId] = useState<string | null>(null);

  const loadCampaigns = async (force = false) => {
    const startTime = Date.now();
    setIsRefreshing(true);
    setError(null);
    try {
      const overview = await HiringManagerPortalClientService.getOverview({ force });
      setCampaigns(overview.campaigns);
      setSessions(overview.sessions);
      setCampaignDetails(overview.campaignDetails);

      setSelectedSession((current) =>
        current
          ? overview.sessions.find((session) => session.id === current.id) ?? null
          : null
      );

      setLastRefreshAt(HiringManagerPortalClientService.getSessionsLastRefresh());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Campaigns and sessions could not be loaded."
      );
    } finally {
      if (force) {
        const elapsedTime = Date.now() - startTime;
        const minSpin = 800; // ms to ensure smooth spin
        if (elapsedTime < minSpin) {
          await new Promise((resolve) => setTimeout(resolve, minSpin - elapsedTime));
        }
      }
      setIsRefreshing(false);
    }
  };

  const removeCandidate = async (sessionId: string, candidateSessionId: string) => {
    const reason = window.prompt("Enter the reason for removing this candidate from the session.");
    if (!reason?.trim()) return;

    setRemovingCandidateId(candidateSessionId);
    try {
      await HiringManagerPortalClientService.removeCandidateFromSession({
        sessionId,
        candidateSessionId,
        reason: reason.trim(),
      });
      await loadCampaigns(true);
    } catch (removeError) {
      alert(removeError instanceof Error ? removeError.message : "Candidate could not be removed.");
    } finally {
      setRemovingCandidateId(null);
    }
  };

  const handleUnlockCandidate = async (candidateSessionId: string) => {
    setUnlockingCandidateId(candidateSessionId);
    try {
      const success = await HiringManagerPortalClientService.unlockCandidate(candidateSessionId);
      if (success) {
        await loadCampaigns(true);
      } else {
        alert("Failed to unlock candidate session.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUnlockingCandidateId(null);
    }
  };

  const handleUpdateSessionStatus = async (sessionId: string, status: "closed") => {
    setUpdatingSessionId(sessionId);
    try {
      const success = await HiringManagerPortalClientService.updateSessionStatus(sessionId, status);
      if (success) {
        await loadCampaigns(true);
      } else {
        alert(`Failed to update session status to ${status}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingSessionId(null);
    }
  };

  const selectedCampaignDetail = useMemo(() => {
    if (!selectedSession) return null;
    return campaignDetails.find((campaign) =>
      campaign.assessmentSessions.some((session) => session.id === selectedSession.id)
      || campaign.name === selectedSession.campaign
    ) ?? null;
  }, [campaignDetails, selectedSession]);

  const activeSessions = useMemo(() => {
    const now = Date.now();
    return sessions.filter((session) => {
      if (session.status === "Closed" || session.status === "Cancelled") {
        return false;
      }
      
      return session.status === "Live";
    });
  }, [sessions]);

  useEffect(() => {
    void loadCampaigns(false);
  }, []);

  const refreshLabel = useMemo(
    () => `Last refresh: ${formatLastRefresh(lastRefreshAt)}`,
    [lastRefreshAt]
  );

  return (
    <div className="space-y-5">
      {/* Live Sessions Console */}
      <Card className="rounded-[1.25rem] border border-white/10 bg-gradient-to-br from-[#0e172e]/80 to-[#080c16]/90 shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:bg-[#0b1329]/45 backdrop-blur-md relative overflow-hidden">
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -left-16 -top-16 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="pointer-events-none absolute -right-16 -bottom-16 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />
        
        <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeSessions.length > 0 ? "bg-emerald-400" : "bg-slate-500"}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${activeSessions.length > 0 ? "bg-emerald-500" : "bg-slate-600"}`}></span>
            </span>
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-300">Live & Active Sessions</CardTitle>
          </div>
          <Badge variant="outline" className="border-white/15 bg-white/[0.02] text-xs font-semibold text-slate-400">
            {activeSessions.length} Active
          </Badge>
        </CardHeader>
        <CardContent className="pt-4">
          {activeSessions.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1">
              <CalendarDays className="h-6 w-6 text-slate-600 mb-1" />
              <p className="font-semibold text-slate-300">No active sessions right now</p>
              <p className="text-[11px] text-slate-500 max-w-[280px]">Sessions scheduled for today will appear here automatically when their start time arrives.</p>
            </div>
          ) : (
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {activeSessions.map((session) => {
                return (
                  <div
                    key={session.id}
                    className="relative overflow-hidden rounded-xl border border-white/10 bg-[#080c16]/65 p-4 flex flex-col justify-between gap-3 shadow-inner hover:border-white/20 transition-all duration-300"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className={[
                          "rounded-md border-none text-[9px] font-bold px-1.5 py-0.5",
                          "bg-emerald-500/10 text-emerald-400"
                        ].join(" ")}>
                          Live
                        </Badge>
                        <span className="text-[10px] text-slate-500 font-medium truncate max-w-[120px]">{session.date}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">{session.campaign}</h4>
                      
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        {session.type === "Remote" ? (
                          <Globe className="h-3.5 w-3.5 text-indigo-400" />
                        ) : (
                          <Building className="h-3.5 w-3.5 text-slate-500" />
                        )}
                        <span className="text-[11px] font-medium truncate max-w-[180px]">{session.location}</span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                        <Users className="h-3.5 w-3.5 text-slate-500" />
                        <span>{session.candidateCount} of {session.candidateLimit} Joined</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between gap-2 rounded bg-black/30 px-2 py-1 border border-white/5">
                        <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">CODE</span>
                        <span className="font-mono text-[11px] font-bold text-white tracking-widest">
                          {session.accessValue}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            void navigator.clipboard?.writeText(session.accessValue);
                            setCopiedSessionId(session.id);
                            setTimeout(() => setCopiedSessionId(null), 2000);
                          }}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          {copiedSessionId === session.id ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={updatingSessionId === session.id}
                          onClick={() => handleUpdateSessionStatus(session.id, "closed")}
                          className="flex-1 h-7 rounded-lg text-[10px] font-bold bg-red-950/20 text-red-400 border border-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-all cursor-pointer"
                        >
                          {updatingSessionId === session.id ? "Closing..." : "Close"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSession(session)}
                          className="h-7 rounded-lg text-[10px] font-bold border-white/10 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white px-2.5 transition-colors cursor-pointer"
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Campaigns Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white">Active Campaigns</h2>
            <Badge variant="secondary" className="rounded-full border-none bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {campaigns.length}
            </Badge>
          </div>
          <p className="text-xs leading-5 text-muted-foreground mt-0.5">{refreshLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => loadCampaigns(true)}
            disabled={isRefreshing}
            className="h-10 border-white/10 bg-transparent hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors text-slate-300"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            type="button"
            asChild
            className="h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-primary text-sm font-semibold text-white transition-all duration-300 hover:opacity-95 shadow-[0_4px_20px_rgba(99,102,241,0.15)]"
          >
            <Link href="/hiring-manager-dashboard/campaigns/create/?returnTo=/hiring-manager-dashboard/campaigns/">
              <Plus className="mr-2 h-4 w-4" />
              Create campaign
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-100">
          {error}
        </p>
      )}

      <div className="space-y-3">
        {campaigns.length === 0 ? (
          <Card className="rounded-[1.25rem] border border-dashed border-border bg-card shadow-sm dark:border-white/10 dark:bg-[#080c16]/50 dark:shadow-none">
            <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
              No campaigns have been created yet. Create a campaign to attach
              assessments and generate candidate Access Codes.
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="rounded-[1.25rem] border border-white/10 bg-[#080c16]/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:bg-[#0b1329]/45"
            >
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={`${getStatusTone(campaign.status)} pointer-events-none`}>
                      {campaign.status}
                    </Badge>
                    <Badge className="pointer-events-none rounded-md border-white/5 bg-white/[0.03] text-xs text-slate-300 hover:bg-white/[0.03]">
                      {campaign.deliveryMode}
                    </Badge>
                    {campaign.approvalStatus && (
                      <Badge
                        className={[
                          "pointer-events-none rounded-md border-none text-xs font-semibold px-2 py-0.5",
                          campaign.approvalStatus === "Pending approval"
                            ? "bg-orange-500/10 text-orange-400"
                            : campaign.approvalStatus === "Rejected"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-emerald-500/10 text-emerald-400"
                        ].join(" ")}
                      >
                        {campaign.approvalStatus}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary shadow-sm w-fit">
                    <Target className="h-3.5 w-3.5 shrink-0 text-primary animate-pulse" />
                    <span className="font-semibold">{campaign.nextMilestone}</span>
                  </div>
                </div>

                <div className="min-w-0 space-y-1">
                  <h2 className="break-words text-lg font-bold leading-snug text-foreground">
                    {campaign.name}
                  </h2>
                  <p className="text-sm text-slate-400 font-medium">
                    {campaign.role} · {campaign.candidateCount} candidate{campaign.candidateCount === 1 ? "" : "s"} ·{" "}
                    {campaign.sessions} session{campaign.sessions === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="pt-2">
                  {/* Assessment Stack Card */}
                  <div className="rounded-xl border border-border bg-[#08101d]/30 p-3.5 shadow-sm dark:border-white/5 dark:bg-white/[0.01] w-full">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Assessment stack
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {campaign.assessmentStack.map((item) => {
                        const Icon = getAssessmentIcon(item);
                        return (
                          <span
                            key={item}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-white/[0.02]"
                          >
                            <Icon className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                            {item}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    className="group h-9 rounded-md border-white/10 bg-white/[0.02] px-3.5 text-xs font-medium text-slate-100 hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors hover:border-primary/30"
                    asChild
                  >
                    <Link href={`/hiring-manager-dashboard/campaigns/${campaign.id}/`}>
                      View More
                      <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <HiringManagerSessionDetailsDialog
        session={selectedSession}
        open={Boolean(selectedSession)}
        onOpenChange={(open) => !open && setSelectedSession(null)}
        campaignName={selectedCampaignDetail?.name}
        campaignRole={selectedCampaignDetail?.role}
        campaignId={selectedCampaignDetail?.id}
        expectedAssessmentCount={selectedCampaignDetail?.assessmentStack.length}
        removingCandidateId={removingCandidateId}
        onKickCandidate={removeCandidate}
        getResultsHref={
          selectedCampaignDetail
            ? (candidate) =>
                `/hiring-manager-dashboard/candidates/${candidate.id}/?campaignId=${selectedCampaignDetail.id}&candidateSessionId=${candidate.id}`
            : undefined
        }
        assessmentStack={selectedCampaignDetail?.assessmentStack}
        onUnlockCandidate={handleUnlockCandidate}
        unlockingCandidateId={unlockingCandidateId}
        onUpdateSessionStatus={handleUpdateSessionStatus}
        updatingSessionId={updatingSessionId}
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
