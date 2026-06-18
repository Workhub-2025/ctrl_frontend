"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
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
  Minus,
  AlertCircle,
  Globe,
  Building,
  Sparkles,
  Layers3,
  Trash2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardInfoCard } from "@/components/dashboard/dashboard-info-card";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import {
  portalAlertErrorClass,
  portalBadgeClass,
  portalDialogShellClass,
  portalIconWrapLgClass,
  portalPanelClass,
  portalPrimaryButtonClass,
  portalProgressBarClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import { useHiringManagerPortal } from "@/hooks/use-hiring-manager-portal";
import { HiringManagerSessionDetailsDialog } from "@/components/dashboard/hiring-manager-session-details-dialog";
import { OptionalDateTimeFields } from "@/components/dashboard/portal/optional-datetime-fields";
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
  const {
    sessions,
    campaigns: allCampaigns,
    campaignDetails,
    error,
    lastRefreshAt,
    loading,
    loadOverview,
  } = useHiringManagerPortal();
  const campaigns = useMemo(
    () =>
      allCampaigns.filter(
        (campaign) =>
          campaign.documentId &&
          campaign.approvalStatus !== "Pending approval" &&
          campaign.approvalStatus !== "Rejected"
      ),
    [allCampaigns]
  );
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdMessage, setCreatedMessage] = useState<string | null>(null);
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [removingCandidateId, setRemovingCandidateId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<HiringManagerSessionListItem | null>(null);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

  const [currentTab, setCurrentTab] = useState<"all" | "live" | "upcoming" | "closed">("all");
  const [updatingSessionId, setUpdatingSessionId] = useState<string | null>(null);
  const [unlockingCandidateId, setUnlockingCandidateId] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdSession, setCreatedSession] = useState<HiringManagerSessionListItem | null>(null);
  const [locationType, setLocationType] = useState<"Remote" | "In-person">("Remote");

  const [draft, setDraft] = useState({
    campaignDocumentId: "",
    name: "",
    candidateLimit: "12",
    startsAt: "",
    location: "",
    address: "",
  });

  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("");
  const [dateError, setDateError] = useState("");
  const [timeError, setTimeError] = useState("");

  const selectedCampaign = useMemo(() => {
    return campaigns.find((c) => c.documentId === draft.campaignDocumentId) ?? null;
  }, [campaigns, draft.campaignDocumentId]);

  // Sync location type and name autofill when campaign changes
  useEffect(() => {
    if (selectedCampaign) {
      if (selectedCampaign.deliveryMode === "Remote") {
        setLocationType("Remote");
      } else if (selectedCampaign.deliveryMode === "In-person") {
        setLocationType("In-person");
      } else {
        setLocationType("Remote"); // Default hybrid to Remote
      }

      const today = new Date();
      const formattedDate = today.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).replace(/\//g, "-");

      setDraft((current) => {
        const isDefault = !current.name.trim() || current.name.includes("Session");
        if (isDefault) {
          return {
            ...current,
            name: `${selectedCampaign.name} - Session ${formattedDate}`,
          };
        }
        return current;
      });
    }
  }, [selectedCampaign]);

  useEffect(() => {
    setDraft((current) => ({
      ...current,
      campaignDocumentId: campaigns.some(
        (campaign) => campaign.documentId === current.campaignDocumentId
      )
        ? current.campaignDocumentId
        : campaigns[0]?.documentId || "",
    }));
  }, [campaigns]);

  const loadSessions = async (force = false) => {
    if (!force) {
      await loadOverview(true);
      return;
    }

    const startTime = Date.now();
    setIsForceRefreshing(true);
    try {
      await loadOverview(true);
    } finally {
      const elapsedTime = Date.now() - startTime;
      const minSpin = 800;
      if (elapsedTime < minSpin) {
        await new Promise((resolve) => setTimeout(resolve, minSpin - elapsedTime));
      }
      setIsForceRefreshing(false);
    }
  };

  const isRefreshing = loading || isForceRefreshing;

  useEffect(() => {
    setSelectedSession((current) =>
      current ? sessions.find((session) => session.id === current.id) ?? null : null
    );
  }, [sessions]);

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

  const handleOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      setCreateError(null);
      setCreatedMessage(null);
      setCreatedSession(null);
      setDraftDate("");
      setDraftTime("");
      setDateError("");
      setTimeError("");
    }
  };

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

    if (locationType === "In-person" && !draft.location.trim()) {
      setCreateError("Physical location is required for In-person sessions.");
      return;
    }

    if (!draftDate) {
      setDateError("Start date is required");
      return;
    }
    if (!draftTime) {
      setTimeError("Start time is required");
      return;
    }

    const combinedDateTime = new Date(`${draftDate}T${draftTime}`);
    if (combinedDateTime.getTime() < Date.now()) {
      setDateError("Start date cannot be in the past");
      return;
    }

    setIsCreating(true);
    try {
      const finalLocation = draft.location.trim() || (locationType === "Remote" ? "Remote Session" : "In-Person");

      const created = await HiringManagerPortalClientService.createSession({
        campaignDocumentId: draft.campaignDocumentId,
        name: draft.name.trim(),
        candidateLimit,
        startsAt: draftDate && draftTime ? new Date(`${draftDate}T${draftTime}`).toISOString() : null,
        location: finalLocation,
        mode: locationType === "Remote" ? "remote" : "in_person",
        ...(draft.address?.trim() ? { address: draft.address.trim() } : {}),
      });

      if (created) {
        setCreatedSession(created);
        setCreatedMessage(`Session created successfully. Code: ${created.accessValue}`);
      } else {
        setCreatedMessage("Session created.");
      }

      setDraft((current) => ({
        ...current,
        name: "",
        candidateLimit: "12",
        startsAt: "",
        location: "",
        address: "",
      }));
      setDraftDate("");
      setDraftTime("");
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

  const deleteSession = async (sessionId: string, sessionName: string) => {
    const confirmed = window.confirm(
      `Delete "${sessionName}"? This cannot be undone. Only empty sessions can be deleted.`
    );
    if (!confirmed) return;

    setCreateError(null);
    setDeletingSessionId(sessionId);
    try {
      await HiringManagerPortalClientService.deleteSession(sessionId);
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
      await loadSessions(true);
    } catch (deleteError) {
      setCreateError(
        deleteError instanceof Error
          ? deleteError.message
          : "Session could not be deleted."
      );
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleUnlockCandidate = async (candidateSessionId: string) => {
    setUnlockingCandidateId(candidateSessionId);
    setCreateError(null);
    try {
      await HiringManagerPortalClientService.unlockCandidate(candidateSessionId);
      await loadSessions(true);
    } catch (err) {
      console.error(err);
      setCreateError(
        err instanceof Error
          ? err.message
          : "Candidate session could not be unlocked."
      );
    } finally {
      setUnlockingCandidateId(null);
    }
  };

  const handleUpdateSessionStatus = async (sessionId: string, status: "closed") => {
    setUpdatingSessionId(sessionId);
    try {
      const success = await HiringManagerPortalClientService.updateSessionStatus(sessionId, status);
      if (success) {
        await loadSessions(true);
      } else {
        alert(`Failed to update session status to ${status}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingSessionId(null);
    }
  };

  const { liveCount, upcomingCount, closedCount } = useMemo(() => {
    const now = Date.now();
    let live = 0;
    let upcoming = 0;
    let closed = 0;
    for (const session of sessions) {
      const startsAtTime = session.startsAt ? new Date(session.startsAt).getTime() : 0;
      const isLive = session.status === "Live" && (!startsAtTime || now >= startsAtTime);
      const isClosed = session.status === "Closed" || session.status === "Cancelled";
      const isUpcoming = (session.status === "Upcoming" || (startsAtTime > 0 && now < startsAtTime)) && !isClosed;

      if (isLive) live++;
      else if (isUpcoming) upcoming++;
      else if (isClosed) closed++;
    }
    return { liveCount: live, upcomingCount: upcoming, closedCount: closed };
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    const now = Date.now();
    return sessions.filter((session) => {
      const startsAtTime = session.startsAt ? new Date(session.startsAt).getTime() : 0;
      const isLive = session.status === "Live" && (!startsAtTime || now >= startsAtTime);
      const isClosed = session.status === "Closed" || session.status === "Cancelled";
      const isUpcoming = (session.status === "Upcoming" || (startsAtTime > 0 && now < startsAtTime)) && !isClosed;

      if (currentTab === "live") return isLive;
      if (currentTab === "upcoming") return isUpcoming;
      if (currentTab === "closed") return isClosed;
      return true;
    });
  }, [sessions, currentTab]);

  const stepperLimit = Number.parseInt(draft.candidateLimit, 10) || 12;

  const handleStep = (amount: number) => {
    setDraft((current) => {
      const val = Number.parseInt(current.candidateLimit, 10) || 12;
      const nextVal = Math.max(1, val + amount);
      return { ...current, candidateLimit: nextVal.toString() };
    });
  };

  const handlePreset = (val: number) => {
    setDraft((current) => ({ ...current, candidateLimit: val.toString() }));
  };

  return (
    <div className="space-y-5">
      {/* Active Sessions Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Active Sessions</h2>
            <Badge variant="secondary" className="rounded-full border-none bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {sessions.length}
            </Badge>
          </div>
          <p className="text-xs leading-5 text-muted-foreground mt-0.5">{refreshLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => loadSessions(true)}
            disabled={isRefreshing}
            className="h-10 border-border bg-transparent text-foreground transition-colors hover:!bg-muted hover:!text-foreground dark:border-white/10 dark:text-slate-300 dark:hover:!bg-white/[0.08] dark:hover:!text-white"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            type="button"
            onClick={() => {
              setIsCreateOpen(true);
              setCreatedSession(null);
              setCreateError(null);
            }}
            className={cn(portalPrimaryButtonClass, "h-10")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create session
          </Button>
        </div>
      </div>

      {error && (
        <p className={cn(portalAlertErrorClass, "text-xs leading-5")}>
          {error}
        </p>
      )}

      {/* Slide-over Drawer for Creating Session */}
      <Sheet open={isCreateOpen} onOpenChange={handleOpenChange}>
        <SheetContent className={cn(portalDialogShellClass, "flex w-full flex-col gap-6 border-l p-6 sm:max-w-md [&>button]:text-slate-400 [&>button]:transition-colors [&>button]:hover:text-white")}>
          <SheetHeader className="border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary shadow-inner">
                <KeyRound className="h-4 w-4" />
              </div>
              <SheetTitle className="text-base font-bold text-white text-left">
                {createdSession ? "Session Created" : "Create Assessment Session"}
              </SheetTitle>
            </div>
            <SheetDescription className="text-xs text-slate-400 text-left mt-1.5 leading-relaxed">
              {createdSession
                ? "Your new assessment session is active. Candidates can now join using the code below."
                : "Generate a unique access code for a campaign session. Multiple candidates can join the same session up to the limit you set."}
            </SheetDescription>
          </SheetHeader>

          {createdSession ? (
            /* SUCCESS VIEW */
            <div className="space-y-6 py-2">
              <div className={cn(portalPanelClass, "relative flex flex-col items-center justify-center overflow-hidden p-6 text-center")}>
                <div className={cn(portalIconWrapLgClass, "mb-3 rounded-full")}>
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Ready for Candidates</h3>
                <p className="mt-1 max-w-[240px] text-[11px] text-slate-400">
                  Share this access code with candidates to allow them to take the assessments.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#080c16]/55 p-[18px] text-center shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Access Code
                </p>
                <p className="mt-2 font-mono text-2xl font-black text-white tracking-widest break-all bg-black/45 py-2.5 px-4 rounded-lg border border-white/5">
                  {createdSession.accessValue}
                </p>
                
                <Button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(createdSession.accessValue);
                    setCopiedSessionId(createdSession.id);
                    setTimeout(() => setCopiedSessionId(null), 2000);
                  }}
                  className="mt-4 w-full h-9 rounded-lg text-xs font-semibold bg-white/10 text-white border border-white/10 hover:bg-white/15 transition-all duration-300"
                >
                  {copiedSessionId === createdSession.id ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5 animate-in zoom-in-50 duration-200" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copy Access Code
                    </>
                  )}
                </Button>
              </div>

              <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400 font-medium">Session Name</span>
                  <span className="text-white font-bold max-w-[200px] truncate">{createdSession.campaign}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400 font-medium">Candidate Limit</span>
                  <span className="text-white font-bold">{createdSession.candidateLimit}</span>
                </div>
                {createdSession.date && (
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400 font-medium">Starts At</span>
                    <span className="text-white font-bold">{createdSession.date}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-slate-400 font-medium">Location</span>
                  <span className="text-indigo-400 font-bold max-w-[200px] truncate">{createdSession.location}</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className={cn(portalPrimaryButtonClass, "h-10 w-full animate-in fade-in slide-in-from-bottom-2 duration-300")}
              >
                Done
              </Button>
            </div>
          ) : (
            /* FORM VIEW */
            <div className="space-y-5 flex-1 flex flex-col justify-between">
              <div className="space-y-5">
                {/* Campaign Selection */}
                <div className="space-y-2">
                  <Label htmlFor="sessionCampaign" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Campaign
                  </Label>
                  <Select
                    value={draft.campaignDocumentId}
                    onValueChange={(value) =>
                      setDraft((current) => ({
                        ...current,
                        campaignDocumentId: value,
                      }))
                    }
                    disabled={campaigns.length === 0}
                  >
                    <SelectTrigger className="h-10 border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors">
	                      <SelectValue placeholder={campaigns.length === 0 ? "No approved campaigns available" : "Select a campaign…"} />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.map((campaign) => (
                        <SelectItem key={campaign.id} value={campaign.documentId ?? ""}>
                          {campaign.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Campaign Preview Card */}
                {selectedCampaign && (
                  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-indigo-500/[0.05] to-primary/[0.05] p-4 shadow-inner">
                    <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 h-20 w-20 rounded-full bg-primary/10 blur-xl pointer-events-none" />
                    <div className="space-y-3 relative z-10">
                      <div>
                        <div className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-indigo-400" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Campaign Preview</span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1 leading-tight">{selectedCampaign.name}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{selectedCampaign.role}</p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 border-t border-white/5 pt-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                          {selectedCampaign.deliveryMode === "Remote" ? (
                            <Globe className="h-3.5 w-3.5 text-slate-400" />
                          ) : selectedCampaign.deliveryMode === "In-person" ? (
                            <Building className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <Layers3 className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span>{selectedCampaign.deliveryMode}</span>
                        </div>
                        
                        <div className="h-3 w-px bg-white/10" />
                        
                        <div className="flex flex-wrap items-center gap-1">
                          {selectedCampaign.assessmentStack.map((as) => (
                            <Badge key={as} className="rounded-md border-none bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 pointer-events-none">
                              {as}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Session Name */}
                <div className="space-y-2">
                  <Label htmlFor="sessionName" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Session Name
                  </Label>
                  <Input
                    id="sessionName"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="e.g. Morning assessment"
                    className="h-10 rounded-lg border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                  />
                </div>

                {/* Candidate Limit Stepper */}
                <div className="space-y-2.5">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Users className="h-4 w-4 text-primary" />
                    Candidate Limit
                  </Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleStep(-1)}
                      disabled={stepperLimit <= 1}
                      className="h-10 w-10 shrink-0 border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/10 hover:text-white bg-transparent"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="flex h-10 flex-1 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] font-mono text-sm font-bold text-white">
                      {stepperLimit} {stepperLimit === 1 ? "Candidate" : "Candidates"}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => handleStep(1)}
                      className="h-10 w-10 shrink-0 border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/10 hover:text-white bg-transparent"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {[5, 12, 25, 50].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handlePreset(preset)}
                        className={[
                          "h-7 rounded-md px-2.5 text-[11px] font-semibold border transition-all duration-200 cursor-pointer",
                          stepperLimit === preset
                            ? "bg-primary/20 border-primary/45 text-white shadow-inner"
                            : "bg-white/[0.02] border-white/5 text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
                        ].join(" ")}
                      >
                        {preset} Candidates
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    Start Date & Time
                  </Label>
                  <OptionalDateTimeFields
                    dateId="sessionDate"
                    timeId="sessionTime"
                    dateValue={draftDate}
                    timeValue={draftTime}
                    onDateChange={(value) => {
                      setDraftDate(value);
                      setDateError("");
                    }}
                    onTimeChange={(value) => {
                      setDraftTime(value);
                      setTimeError("");
                    }}
                    dateError={dateError}
                    timeError={timeError}
                    disabled={isCreating}
                  />
                </div>

                {/* Delivery Mode Toggle (only for Hybrid Campaigns) */}
                {selectedCampaign?.deliveryMode === "Hybrid" && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Session Delivery Mode
                    </Label>
                    <div className="flex rounded-lg border border-white/10 bg-white/[0.02] p-1">
                      <button
                        type="button"
                        onClick={() => setLocationType("Remote")}
                        className={[
                          "flex-1 rounded-md py-1.5 text-xs font-bold transition-all cursor-pointer",
                          locationType === "Remote"
                            ? "bg-primary text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        ].join(" ")}
                      >
                        Remote
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationType("In-person")}
                        className={[
                          "flex-1 rounded-md py-1.5 text-xs font-bold transition-all cursor-pointer",
                          locationType === "In-person"
                            ? "bg-primary text-white shadow-sm"
                            : "text-slate-400 hover:text-slate-200"
                        ].join(" ")}
                      >
                        In-Person
                      </button>
                    </div>
                  </div>
                )}

                {/* Location / Link Input */}
                <div className="space-y-2">
                  <Label htmlFor="sessionLocation" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <MapPin className="h-4 w-4 text-primary" />
                    {locationType === "Remote" ? "Session Video Link (Zoom, Teams)" : "Physical Location / Room"}
                  </Label>
                  <Input
                    id="sessionLocation"
                    value={draft.location}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, location: event.target.value }))
                    }
                    placeholder={
                      locationType === "Remote"
                        ? "e.g. https://zoom.us/j/... (Optional)"
                        : "e.g. Room 4B, London HQ (Required)"
                    }
                    className="h-10 rounded-lg border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                  />
                  {locationType === "Remote" && (
                    <p className="text-[10px] text-slate-500">
                      If left blank, this will default to "Remote Session".
                    </p>
                  )}
                </div>

                {/* Session Address (In-person only) */}
                {locationType === "In-person" && (
                  <div className="space-y-2">
                    <Label htmlFor="sessionAddress" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <Building className="h-4 w-4 text-primary" />
                      Session Address
                      <span className="ml-2 text-xs bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full font-normal normal-case tracking-normal">Optional for now</span>
                    </Label>
                    <Input
                      id="sessionAddress"
                      value={draft.address}
                      onChange={(e) => setDraft((current) => ({ ...current, address: e.target.value }))}
                      placeholder="e.g. 123 Main Street, London EC1A 1BB"
                      className="h-10 rounded-lg border-white/10 bg-white/[0.02] text-slate-100 placeholder:text-slate-500 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* Drawer Actions / Submit */}
              <div className="space-y-3 pt-6 border-t border-white/5">
                {createError && (
                  <p className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs leading-normal text-red-400 flex items-center gap-2 animate-in fade-in duration-200">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {createError}
                  </p>
                )}
                
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleOpenChange(false)}
                    className="flex-1 h-10 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white bg-transparent"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={createSession}
                    disabled={isCreating || campaigns.length === 0}
                    className={cn(portalPrimaryButtonClass, "h-10 flex-1 disabled:cursor-not-allowed disabled:opacity-50")}
                  >
	                    {isCreating ? "Creating…" : "Create Session"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {error && (
        <p className={cn(portalAlertErrorClass, "text-xs leading-5")}>
          {error}
        </p>
      )}

      <Tabs value={currentTab} onValueChange={(value) => setCurrentTab(value as any)} className="w-full">
        <TabsList className="mb-4 h-10 rounded-xl border border-border bg-muted/40 p-1 dark:border-white/10 dark:bg-white/[0.02]">
          <TabsTrigger value="all" className="rounded-lg text-xs font-semibold px-4 cursor-pointer">
            All
            <Badge variant="secondary" className="ml-1.5 rounded-full border-none bg-slate-500/20 text-slate-400 px-1.5 py-0">
              {sessions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="live" className="rounded-lg text-xs font-semibold px-4 cursor-pointer">
            Live
            {liveCount > 0 ? (
              <Badge variant="secondary" className={cn("ml-1.5 animate-pulse rounded-full border-none px-1.5 py-0", portalBadgeClass)}>
                {liveCount}
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-1.5 rounded-full border-none bg-slate-500/20 text-slate-400 px-1.5 py-0">
                0
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="rounded-lg text-xs font-semibold px-4 cursor-pointer">
            Upcoming
            {upcomingCount > 0 ? (
              <Badge variant="secondary" className="ml-1.5 rounded-full border-none bg-indigo-500/20 text-indigo-400 px-1.5 py-0">
                {upcomingCount}
              </Badge>
            ) : (
              <Badge variant="secondary" className="ml-1.5 rounded-full border-none bg-slate-500/20 text-slate-400 px-1.5 py-0">
                0
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="closed" className="rounded-lg text-xs font-semibold px-4 cursor-pointer">
            Closed
            <Badge variant="secondary" className="ml-1.5 rounded-full border-none bg-slate-500/20 text-slate-400 px-1.5 py-0">
              {closedCount}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <DashboardInfoCard interactive={false} className="border-dashed shadow-none">
            <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
              No sessions found in this category.
            </CardContent>
          </DashboardInfoCard>
        ) : (
          filteredSessions.map((session) => (
            <DashboardInfoCard
              key={session.id}
            >
              <CardContent className="space-y-4 p-5 pl-7">
                {/* Header row: Badges on left, Candidates count with progress bar on right */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={[
                      "rounded-md border-none text-[10px] font-semibold px-2 py-0.5",
                      getStatusTone(session.status)
                    ].join(" ")}>
                      {session.status}
                    </Badge>
                    <Badge className="rounded-md border-border/55 bg-muted/40 text-[10px] font-semibold text-muted-foreground hover:bg-muted/40 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.03]">
                      {session.type}
                    </Badge>
                  </div>
                  
                  {/* Candidates joined status with pill indicator */}
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 rounded-lg border border-indigo-500/15 bg-indigo-500/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-500 shadow-sm dark:text-indigo-300/90">
                      <Users className="h-3.5 w-3.5 text-indigo-400" />
                      <span>{session.candidateCount} of {session.candidateLimit} Joined</span>
                    </span>
                    {session.candidateLimit > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full border border-border/50 bg-muted dark:border-white/5 dark:bg-white/5">
                          <div 
                            className={portalProgressBarClass}
                            style={{ width: `${Math.min(100, (session.candidateCount / session.candidateLimit) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {Math.round((session.candidateCount / session.candidateLimit) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Details and Actions Row */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  {/* Campaign Name & Details */}
                  <div className="space-y-1">
                    <h2 className="break-words text-base font-bold leading-snug text-foreground">
                      {session.campaign}
                    </h2>
                    <p className="break-words text-xs font-medium leading-5 text-muted-foreground">
                      {session.date} · {session.location}
                    </p>
                  </div>

                  {/* Access code and Action Buttons inline */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex items-center gap-2 rounded-lg border border-border/55 bg-background/60 px-3 py-1.5 dark:border-white/10 dark:bg-black/30">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">CODE</span>
                      <span className="rounded border border-border/50 bg-muted/70 px-2 py-0.5 font-mono text-xs font-bold tracking-widest text-foreground dark:border-white/5 dark:bg-black/45 dark:text-white">
                        {session.accessValue}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          void navigator.clipboard?.writeText(session.accessValue);
                          setCopiedSessionId(session.id);
                          setTimeout(() => setCopiedSessionId(null), 2000);
                        }}
                        className="h-8 rounded-lg border border-border bg-background/70 px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                      >
                        {copiedSessionId === session.id ? (
                          <>
                            <Check className="mr-1.5 h-3.5 w-3.5" />
                            <span>Copied!</span>
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
                        className="h-8 rounded-lg border-border bg-transparent px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted hover:text-foreground dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                        View details
                      </Button>

                      {session.candidateCount === 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={deletingSessionId === session.id}
                          onClick={() => deleteSession(session.id, session.campaign)}
                          className="h-8 rounded-lg border-red-500/20 bg-transparent px-3 text-xs font-semibold text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          {deletingSessionId === session.id ? "Deleting…" : "Delete"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CardContent>
            </DashboardInfoCard>
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
        onDeleteSession={
          selectedSession?.candidateCount === 0
            ? (sessionId) => deleteSession(sessionId, selectedSession.campaign)
            : undefined
        }
        deletingSessionId={deletingSessionId}
        onInvitesSent={() => loadSessions(true)}
      />
    </div>
  );
}
