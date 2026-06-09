"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CalendarClock,
  Copy,
  Eye,
  KeyRound,
  MapPin,
  Plus,
  RefreshCw,
  Users,
  Check,
} from "lucide-react";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import { HiringManagerSessionDetailsDialog } from "@/components/dashboard/hiring-manager-session-details-dialog";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignDetail,
  type HiringManagerCampaignListItem,
  type HiringManagerSessionListItem,
} from "@/services/hiring-manager-portal-client.service";

function formatLastRefresh(value: number | null) {
  if (!value) return "Not refreshed yet";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function HiringManagerSessionsList() {
  const [sessions, setSessions] = useState<HiringManagerSessionListItem[]>([]);
  const [campaigns, setCampaigns] = useState<HiringManagerCampaignListItem[]>([]);
  const [campaignDetails, setCampaignDetails] = useState<HiringManagerCampaignDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(
    HiringManagerPortalClientService.getSessionsLastRefresh()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [removingCandidateId, setRemovingCandidateId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<HiringManagerSessionListItem | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    campaignDocumentId: "",
    name: "",
    candidateLimit: "12",
    startsAt: "",
    location: "",
  });

  const loadSessions = async (force = false) => {
    const startTime = Date.now();
    setIsRefreshing(true);
    setError(null);
    try {
      const overview = await HiringManagerPortalClientService.getOverview({ force });
      const approvedCampaigns = overview.campaigns.filter(
        (campaign) => campaign.documentId && campaign.approvalStatus !== "Pending approval" && campaign.approvalStatus !== "Rejected"
      );
      setSessions(overview.sessions);
      setCampaignDetails(overview.campaignDetails);
      setSelectedSession((current) =>
        current
          ? overview.sessions.find((session) => session.id === current.id) ?? null
          : null
      );
      setCampaigns(approvedCampaigns);
      setDraft((current) => ({
        ...current,
        campaignDocumentId: approvedCampaigns.some((campaign) => campaign.documentId === current.campaignDocumentId)
          ? current.campaignDocumentId
          : approvedCampaigns[0]?.documentId || "",
      }));
      setLastRefreshAt(HiringManagerPortalClientService.getSessionsLastRefresh());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Sessions could not be loaded."
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

  useEffect(() => {
    void loadSessions(false);
  }, []);

  const refreshLabel = useMemo(
    () => `Last refresh: ${formatLastRefresh(lastRefreshAt)}`,
    [lastRefreshAt]
  );

  const selectedCampaignDetail = useMemo(() => {
    if (!selectedSession) return null;
    return campaignDetails.find((campaign) =>
      campaign.assessmentSessions.some((session) => session.id === selectedSession.id)
      || campaign.name === selectedSession.campaign
    ) ?? null;
  }, [campaignDetails, selectedSession]);

  const createSession = async () => {
    setCreateError(null);
    setCreatedMessage(null);
    const candidateLimit = Number.parseInt(draft.candidateLimit, 10);

    if (!draft.campaignDocumentId) {
      setCreateError("Select a campaign first.");
      return;
    }
    if (!draft.name.trim()) {
      setCreateError("Session name is required.");
      return;
    }
    if (!Number.isInteger(candidateLimit) || candidateLimit < 1) {
      setCreateError("Candidate limit must be at least 1.");
      return;
    }

    setIsCreating(true);
    try {
      const created = await HiringManagerPortalClientService.createSession({
        campaignDocumentId: draft.campaignDocumentId,
        name: draft.name.trim(),
        candidateLimit,
        startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
        location: draft.location.trim() || null,
      });

      setCreatedMessage(
        created
          ? `Session created. Share Session Code ${created.accessValue} with candidates.`
          : "Session created."
      );
      setDraft((current) => ({
        ...current,
        name: "",
        candidateLimit: "12",
        startsAt: "",
        location: "",
      }));
      await loadSessions(true);
    } catch (createSessionError) {
      setCreateError(
        createSessionError instanceof Error
          ? createSessionError.message
          : "Session could not be created."
      );
    } finally {
      setIsCreating(false);
    }
  };

  const removeCandidate = async (sessionId: string, candidateSessionId: string) => {
    const reason = window.prompt("Enter the reason for removing this candidate from the session.");
    if (!reason?.trim()) return;

    setCreateError(null);
    setRemovingCandidateId(candidateSessionId);
    try {
      await HiringManagerPortalClientService.removeCandidateFromSession({
        sessionId,
        candidateSessionId,
        reason: reason.trim(),
      });
      await loadSessions(true);
    } catch (removeError) {
      setCreateError(
        removeError instanceof Error
          ? removeError.message
          : "Candidate could not be removed."
      );
    } finally {
      setRemovingCandidateId(null);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1329]/40 backdrop-blur-md shadow-2xl">
        {/* Subtle glow effect */}
        <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
        
        <CardHeader className="border-b border-white/10 p-5 bg-white/[0.01]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-inner">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-white">Create assessment session</CardTitle>
                <p className="mt-1 max-w-2xl text-xs text-slate-400">
                  Create a unique access code for a campaign session. Multiple candidates can join the same session up to the limit you set.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="rounded-md border-none bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-400 pointer-events-none">
              One code per session
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-2">
              <Label htmlFor="sessionCampaign" className="text-xs font-semibold text-slate-300">
                Campaign
              </Label>
              <select
                id="sessionCampaign"
                value={draft.campaignDocumentId}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    campaignDocumentId: event.target.value,
                  }))
                }
                className="h-10 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {campaigns.length === 0 ? (
                  <option value="" className="bg-[#0b1329]">No approved campaigns available</option>
                ) : (
                  campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.documentId ?? ""} className="bg-[#0b1329]">
                      {campaign.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionName" className="text-xs font-semibold text-slate-300">
                Session name
              </Label>
              <Input
                id="sessionName"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="e.g. Morning assessment"
                className="h-10 rounded-md border-white/10 bg-white/[0.03] text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="candidateLimit" className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Users className="h-4 w-4 text-indigo-400" />
                Candidate limit
              </Label>
              <Input
                id="candidateLimit"
                type="number"
                min="1"
                value={draft.candidateLimit}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    candidateLimit: event.target.value,
                  }))
                }
                className="h-10 rounded-md border-white/10 bg-white/[0.03] text-slate-100 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionStartsAt" className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <CalendarClock className="h-4 w-4 text-indigo-400" />
                Starts at
              </Label>
              <Input
                id="sessionStartsAt"
                type="datetime-local"
                value={draft.startsAt}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, startsAt: event.target.value }))
                }
                className="h-10 rounded-md border-white/10 bg-white/[0.03] text-slate-100 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionLocation" className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <MapPin className="h-4 w-4 text-indigo-400" />
                Location
              </Label>
              <Input
                id="sessionLocation"
                value={draft.location}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, location: event.target.value }))
                }
                placeholder="Optional session location"
                className="h-10 rounded-md border-white/10 bg-white/[0.03] text-slate-100 placeholder:text-slate-500 focus-visible:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/5 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-xs text-slate-400">
              Only approved campaigns can generate active sessions. Copy and share the generated session code with candidates to allow them to join.
            </p>
            <Button
              type="button"
              onClick={createSession}
              disabled={isCreating || campaigns.length === 0}
              className="h-10 rounded-xl bg-gradient-to-r from-primary to-indigo-500 font-bold text-white hover:opacity-95 shadow-[0_0_15px_rgba(99,102,241,0.15)] disabled:opacity-50"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isCreating ? "Creating..." : "Create session"}
            </Button>
          </div>
          {createError && (
            <p className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs leading-5 text-red-400">
              {createError}
            </p>
          )}
          {createdMessage && (
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs leading-5 text-emerald-400">
              {createdMessage}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">{refreshLabel}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => loadSessions(true)}
          disabled={isRefreshing}
          className="w-fit hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <p className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-100">
          {error}
        </p>
      )}

      <div className="space-y-4">
        {sessions.length === 0 ? (
          <Card className="rounded-[1.25rem] border border-dashed border-white/10 bg-[#080c16]/50 shadow-none">
            <CardContent className="p-6 text-sm leading-6 text-slate-400">
              No sessions have been created yet. Create a session to generate a candidate access code.
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card
              key={session.id}
              className="group rounded-xl border border-white/10 bg-[#080c16]/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-primary/45 dark:bg-[#0b1329]/45 hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] transition-all duration-300"
            >
              <CardContent className="grid gap-4 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={[
                        "rounded-md border-none text-[10px] font-semibold px-2 py-0.5",
                        getStatusTone(session.status)
                      ].join(" ")}>
                        {session.status}
                      </Badge>
                      <Badge className="rounded-md border-white/10 bg-white/[0.03] text-[10px] text-slate-300 font-semibold hover:bg-white/[0.03]">
                        {session.type}
                      </Badge>
                    </div>

                    <div className="text-[10px] font-bold text-slate-300 bg-white/[0.02] border border-white/10 px-2.5 py-1 rounded flex items-center gap-1.5 shadow-sm">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      <span>{session.candidateCount} of {session.candidateLimit} Candidates</span>
                    </div>
                  </div>
                  <div>
                    <h2 className="break-words text-base font-bold leading-snug text-white">
                      {session.campaign}
                    </h2>
                    <p className="mt-1.5 break-words text-xs leading-5 text-slate-400 font-medium">
                      {session.date} · {session.location}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-[#0b1329]/25 p-4 shadow-sm backdrop-blur-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Session Access Code
                  </p>
                  <div className="mt-2.5 rounded-lg border border-white/15 bg-black/45 p-3">
                    <p className="text-[9px] font-semibold uppercase text-indigo-400 tracking-wider">
                      {session.accessMode}
                    </p>
                    <p className="mt-1 break-all font-mono text-sm font-bold text-white tracking-wider">
                      {session.accessValue}
                    </p>
                  </div>
                  <div className="mt-3.5 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        void navigator.clipboard?.writeText(session.accessValue);
                        setCopiedSessionId(session.id);
                        setTimeout(() => setCopiedSessionId(null), 2000);
                      }}
                      className="h-8 rounded-lg text-xs font-semibold bg-white/10 text-white border border-white/10 hover:bg-white/15 px-3 flex-1 transition-all duration-300"
                    >
                      {copiedSessionId === session.id ? (
                        <>
                          <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400 animate-in zoom-in-50 duration-200" />
                          <span className="text-emerald-400 animate-in fade-in duration-200">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                          Copy code
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSession(session)}
                      className="h-8 rounded-lg text-xs font-semibold border-white/10 bg-transparent text-slate-200 hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white px-3 transition-colors"
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      View details
                    </Button>
                  </div>
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
      />
    </div>
  );
}
