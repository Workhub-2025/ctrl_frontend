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
  Minus,
  AlertCircle,
  Globe,
  Building,
  Sparkles,
  Layers3,
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

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createdSession, setCreatedSession] = useState<HiringManagerSessionListItem | null>(null);
  const [locationType, setLocationType] = useState<"Remote" | "In-person">("Remote");

  const [draft, setDraft] = useState({
    campaignDocumentId: "",
    name: "",
    candidateLimit: "12",
    startsAt: "",
    location: "",
  });

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

  const handleOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      setCreateError(null);
      setCreatedMessage(null);
      setCreatedSession(null);
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

    setIsCreating(true);
    try {
      const finalLocation = draft.location.trim() || (locationType === "Remote" ? "Remote Session" : "In-Person");

      const created = await HiringManagerPortalClientService.createSession({
        campaignDocumentId: draft.campaignDocumentId,
        name: draft.name.trim(),
        candidateLimit,
        startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
        location: finalLocation,
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
            <h2 className="text-lg font-bold text-white">Active Sessions</h2>
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
            className="h-10 border-white/10 bg-transparent hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors text-slate-300"
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
            className="h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-primary text-sm font-semibold text-white transition-all duration-300 hover:opacity-95 shadow-[0_4px_20px_rgba(99,102,241,0.15)]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create session
          </Button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-100">
          {error}
        </p>
      )}

      {/* Slide-over Drawer for Creating Session */}
      <Sheet open={isCreateOpen} onOpenChange={handleOpenChange}>
        <SheetContent className="w-full sm:max-w-md border-l border-white/10 bg-gradient-to-b from-[#0e172e] to-[#080c16]/95 text-slate-100 backdrop-blur-lg p-6 overflow-y-auto shadow-2xl flex flex-col gap-6 [&>button]:text-slate-400 [&>button]:hover:text-white [&>button]:transition-colors">
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
              <div className="flex flex-col items-center justify-center text-center p-6 rounded-2xl border border-emerald-500/10 bg-emerald-500/5 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 h-20 w-20 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 shadow-inner">
                  <Check className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Ready for Candidates</h3>
                <p className="text-[11px] text-slate-400 max-w-[240px] mt-1">
                  Share this access code with candidates to allow them to take the assessments.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-[#080c16]/55 p-4.5 text-center shadow-sm">
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
                      <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-400 animate-in zoom-in-50 duration-200" />
                      <span className="text-emerald-400">Copied!</span>
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
                className="w-full h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-primary text-sm font-semibold text-white transition-all duration-300 hover:opacity-95 animate-in fade-in slide-in-from-bottom-2 duration-300"
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
                      <SelectValue placeholder={campaigns.length === 0 ? "No approved campaigns available" : "Select a campaign..."} />
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

                {/* Starts At */}
                <div className="space-y-2">
                  <Label htmlFor="sessionStartsAt" className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                    className="h-10 rounded-lg border-white/10 bg-white/[0.02] text-slate-100 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors [color-scheme:dark]"
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
                    className="flex-1 h-10 rounded-xl bg-gradient-to-r from-indigo-500 to-primary text-sm font-semibold text-white transition-all duration-300 hover:opacity-95 shadow-[0_4px_20px_rgba(99,102,241,0.15)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCreating ? "Creating..." : "Create Session"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

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
      />
    </div>
  );
}
