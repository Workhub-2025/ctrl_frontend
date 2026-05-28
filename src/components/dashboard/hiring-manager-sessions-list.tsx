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
  KeyRound,
  MapPin,
  Plus,
  RefreshCw,
  UserMinus,
  Users,
} from "lucide-react";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import {
  HiringManagerPortalClientService,
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
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(
    HiringManagerPortalClientService.getSessionsLastRefresh()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [removingCandidateId, setRemovingCandidateId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    campaignDocumentId: "",
    name: "",
    candidateLimit: "12",
    startsAt: "",
    location: "",
  });

  const loadSessions = async (force = false) => {
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await HiringManagerPortalClientService.getSessions({ force });
      const campaignData = await HiringManagerPortalClientService.getCampaigns({ force });
      setSessions(data);
      setCampaigns(campaignData.filter((campaign) => campaign.documentId));
      setDraft((current) => ({
        ...current,
        campaignDocumentId: current.campaignDocumentId || campaignData[0]?.documentId || "",
      }));
      setLastRefreshAt(HiringManagerPortalClientService.getSessionsLastRefresh());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Sessions could not be loaded."
      );
    } finally {
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
    <div className="space-y-4">
      <Card className="overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-sm dark:border-white/5 dark:bg-[#080c16]/70 dark:shadow-none">
        <CardHeader className="border-b border-border bg-muted/40 p-5 dark:border-white/5 dark:bg-white/[0.03]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg text-foreground">Create session</CardTitle>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Create one access code for a campaign session. Multiple candidates can join the same session up to the limit you set.
                </p>
              </div>
            </div>
            <Badge className="rounded-full border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary hover:bg-primary/10">
              One code per session
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-2">
            <Label htmlFor="sessionCampaign">
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
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {campaigns.length === 0 ? (
                <option value="">Create a campaign first</option>
              ) : (
                campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.documentId ?? ""}>
                    {campaign.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionName">
              Session name
            </Label>
            <Input
              id="sessionName"
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="e.g. Morning assessment"
            />
          </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="candidateLimit" className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
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
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionStartsAt" className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              Starts at
            </Label>
            <Input
              id="sessionStartsAt"
              type="datetime-local"
              value={draft.startsAt}
              onChange={(event) =>
                setDraft((current) => ({ ...current, startsAt: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionLocation" className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Location
            </Label>
            <Input
              id="sessionLocation"
              value={draft.location}
              onChange={(event) =>
                setDraft((current) => ({ ...current, location: event.target.value }))
              }
              placeholder="Optional session location"
            />
          </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-border pt-5 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              After creation, copy the generated session code and share it with candidates for this session.
            </p>
            <Button
              type="button"
              onClick={createSession}
              disabled={isCreating || campaigns.length === 0}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isCreating ? "Creating..." : "Create session"}
            </Button>
          </div>
          {createError && (
            <p className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs leading-5 text-red-700 dark:text-red-100">
              {createError}
            </p>
          )}
          {createdMessage && (
            <p className="rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs leading-5 text-emerald-700 dark:text-emerald-100">
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
          className="w-fit"
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

      <div className="space-y-3">
        {sessions.length === 0 ? (
          <Card className="rounded-[1.25rem] border border-dashed border-border bg-card shadow-sm dark:border-white/10 dark:bg-[#080c16]/50 dark:shadow-none">
            <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
              No sessions have been created yet. Create a session to generate a candidate access code.
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => (
            <Card
              key={session.id}
              className="rounded-[1.25rem] border border-border bg-card shadow-sm transition-colors hover:border-primary/30 dark:border-white/5 dark:bg-[#080c16]/70 dark:shadow-none"
            >
              <CardContent className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={getStatusTone(session.status)}>
                      {session.status}
                    </Badge>
                    <Badge className="rounded-md border-border bg-background text-xs text-muted-foreground hover:bg-background dark:border-white/10 dark:bg-white/[0.03]">
                      {session.type}
                    </Badge>
                  </div>
                  <div>
                    <h2 className="break-words text-base font-semibold leading-snug text-foreground">
                      {session.campaign}
                    </h2>
                    <p className="mt-2 break-words text-sm leading-5 text-muted-foreground">
                      {session.date} · {session.location}
                    </p>
                  </div>
                  <p className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm leading-6 text-muted-foreground dark:border-white/5 dark:bg-white/[0.03]">
                    <Users className="h-4 w-4 text-primary" />
                    {session.candidateCount} of {session.candidateLimit} candidates joined
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background p-4 shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Session code
                  </p>
                  <div className="mt-3 rounded-lg border border-border bg-card p-3 dark:border-white/10 dark:bg-[#04070d]">
                    <p className="text-xs uppercase text-muted-foreground">
                      {session.accessMode}
                    </p>
                    <p className="mt-2 break-all font-mono text-sm font-semibold text-foreground">
                      {session.accessValue}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(session.accessValue)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy code
                    </Button>
                  </div>
                </div>
                {session.candidates.length > 0 && (
                  <div className="mt-4 rounded-xl border border-border bg-background p-4 shadow-sm dark:border-white/5 dark:bg-white/[0.03] xl:col-span-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Joined candidates
                    </p>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {session.candidates.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3 dark:border-white/10 dark:bg-[#04070d]"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium text-foreground">
                              {candidate.name}
                            </p>
                            <p className="mt-1 break-words text-xs text-muted-foreground">
                              {candidate.email || candidate.status || "Joined"}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={removingCandidateId === candidate.id}
                            onClick={() => removeCandidate(session.id, candidate.id)}
                            className="h-8 shrink-0 border-red-400/20 bg-red-400/10 px-2 text-xs text-red-700 hover:bg-red-400/15 dark:text-red-100"
                          >
                            <UserMinus className="mr-1 h-3.5 w-3.5" />
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
