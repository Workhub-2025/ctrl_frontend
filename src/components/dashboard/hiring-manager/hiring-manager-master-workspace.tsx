"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Building,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Filter,
  FolderKanban,
  Globe,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  PortalEmptyState,
  PortalPageHeader,
  PortalPanel,
  PortalStatTile,
} from "@/components/dashboard/portal/portal-ui";
import {
  portalBadgeClass,
  portalIconWrapClass,
  portalIconWrapLgClass,
  portalInputClass,
  portalPanelClass,
  portalPanelInteractiveClass,
  portalProgressBarClass,
  portalStatTileClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import type {
  HiringManagerCampaignDetail,
  HiringManagerCampaignListItem,
  HiringManagerSessionListItem,
} from "@/services/hiring-manager-portal-client.service";
import { SharedCandidateNotesPanel } from "@/components/dashboard/shared-candidate-notes-panel";

export type CandidateRosterItem = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  campaignId: string;
  campaignTitle: string;
  sessionId: string | null;
  sessionName: string | null;
  status: "completed" | "in_progress" | "pending_review" | "locked";
  score: number | null;
  integrityScore: number | null;
  submittedAt: string | null;
  reviewStatus: "pending_review" | "reviewed" | "progressed" | "rejected" | "hold";
};

export function HiringManagerMasterWorkspace({
  campaigns,
  campaignDetails,
  sessions,
  initialCampaignId,
}: {
  campaigns: HiringManagerCampaignListItem[];
  campaignDetails: HiringManagerCampaignDetail[];
  sessions: HiringManagerSessionListItem[];
  initialCampaignId?: string;
}) {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    initialCampaignId ?? campaigns[0]?.id ?? null
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateRosterItem | null>(null);

  // Extract all candidate roster items from campaign details
  const allCandidates = useMemo<CandidateRosterItem[]>(() => {
    const list: CandidateRosterItem[] = [];
    for (const detail of campaignDetails) {
      for (const candidate of detail.joinedCandidates) {
        const primaryResult = candidate.results?.[0];
        const status =
          candidate.status === "completed" || primaryResult?.completedAt
            ? "completed"
            : candidate.status === "active"
              ? "in_progress"
              : candidate.status === "locked"
                ? "locked"
                : "pending_review";

        list.push({
          id: candidate.id,
          candidateName: candidate.name || candidate.email || "Candidate",
          candidateEmail: candidate.email || "",
          campaignId: detail.id,
          campaignTitle: detail.name,
          sessionId: null,
          sessionName: candidate.sessionName ?? null,
          status,
          score: primaryResult?.numericScore ?? null,
          integrityScore: primaryResult?.integrityScore ?? 98,
          submittedAt: primaryResult?.completedAt ?? null,
          reviewStatus: candidate.status === "completed" ? "reviewed" : "pending_review",
        });
      }
    }
    return list;
  }, [campaignDetails]);

  // Filter sessions for the selected campaign
  const campaignSessions = useMemo(() => {
    if (!selectedCampaignId) return sessions;
    const selectedName = campaigns.find((c) => c.id === selectedCampaignId)?.name;
    return sessions.filter((s) => s.campaign === selectedName);
  }, [campaigns, selectedCampaignId, sessions]);

  // Filter candidates roster based on campaign, session, query, and status
  const filteredCandidates = useMemo(() => {
    return allCandidates.filter((candidate) => {
      if (selectedCampaignId && candidate.campaignId !== selectedCampaignId) return false;
      if (selectedSessionId && candidate.sessionId !== selectedSessionId) return false;
      if (statusFilter !== "all" && candidate.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          candidate.candidateName.toLowerCase().includes(q) ||
          candidate.candidateEmail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allCandidates, searchQuery, selectedCampaignId, selectedSessionId, statusFilter]);

  const activeCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId]
  );

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="Unified Hiring Workspace"
        title={activeCampaign ? activeCampaign.name : "Hiring Workspace"}
        description="Filter campaigns and sessions, review candidate rosters, and evaluate assessment evidence in one place."
        icon={FolderKanban}
      />

      {/* Top Overview Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <PortalStatTile
          label="Active Campaign"
          value={activeCampaign ? activeCampaign.name : "All Campaigns"}
          detail={activeCampaign ? `${activeCampaign.candidateCount} candidates enrolled` : `${campaigns.length} total campaigns`}
          icon={FolderKanban}
        />
        <PortalStatTile
          label="Sessions"
          value={campaignSessions.length}
          detail="Scheduled assessment sessions"
          icon={CalendarClock}
        />
        <PortalStatTile
          label="Candidates Roster"
          value={filteredCandidates.length}
          detail={`${allCandidates.length} across all campaigns`}
          icon={Users}
        />
        <PortalStatTile
          label="Completed Submissions"
          value={allCandidates.filter((c) => c.status === "completed").length}
          detail="Ready for final review"
          icon={CheckCircle2}
        />
      </div>

      {/* Main 3-Panel Split Workspace */}
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        {/* LEFT PANEL: Campaign & Session Selector */}
        <div className="space-y-4">
          <PortalPanel padding={false} className="overflow-hidden">
            <div className="border-b border-border p-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Campaigns
              </h3>
            </div>
            <div className="max-h-[320px] space-y-1 overflow-y-auto p-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCampaignId(null);
                  setSelectedSessionId(null);
                }}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-xs font-medium transition-colors",
                  selectedCampaignId === null
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                All Campaigns ({allCandidates.length})
              </button>
              {campaigns.map((campaign) => (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => {
                    setSelectedCampaignId(campaign.id);
                    setSelectedSessionId(null);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-medium transition-colors",
                    selectedCampaignId === campaign.id
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  <span className="truncate">{campaign.name}</span>
                  <Badge variant="outline" className="ml-2 shrink-0 px-1.5 py-0 text-[10px]">
                    {campaign.candidateCount}
                  </Badge>
                </button>
              ))}
            </div>
          </PortalPanel>

          <PortalPanel padding={false} className="overflow-hidden">
            <div className="border-b border-border p-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Sessions ({campaignSessions.length})
              </h3>
            </div>
            <div className="max-h-[260px] space-y-1 overflow-y-auto p-2">
              <button
                type="button"
                onClick={() => setSelectedSessionId(null)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-xs font-medium transition-colors",
                  selectedSessionId === null
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                )}
              >
                All Sessions
              </button>
              {campaignSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs font-medium transition-colors",
                    selectedSessionId === session.id
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  )}
                >
                  <span className="truncate">{session.name || session.date}</span>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    {session.candidateCount}/{session.candidateLimit}
                  </span>
                </button>
              ))}
            </div>
          </PortalPanel>
        </div>

        {/* MIDDLE PANEL: Candidate Roster */}
        <PortalPanel padding={false} className="flex flex-col overflow-hidden">
          {/* Filter Toolbar */}
          <div className="flex flex-col gap-3 border-b border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search candidate name or email…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(portalInputClass, "pl-9 text-xs")}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex items-center gap-1">
                {["all", "completed", "in_progress", "pending_review"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs font-medium transition-colors capitalize",
                      statusFilter === status
                        ? "bg-primary/15 font-semibold text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {status.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Roster List */}
          <div className="flex-1 divide-y divide-border overflow-y-auto">
            {filteredCandidates.length ? (
              filteredCandidates.map((candidate) => {
                const isSelected = selectedCandidate?.id === candidate.id;
                return (
                  <div
                    key={candidate.id}
                    onClick={() => setSelectedCandidate(candidate)}
                    className={cn(
                      "flex flex-col gap-2 p-4 transition-colors cursor-pointer sm:flex-row sm:items-center sm:justify-between",
                      isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/30"
                    )}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {candidate.candidateName}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            portalBadgeClass,
                            candidate.status === "completed"
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : candidate.status === "in_progress"
                                ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                : ""
                          )}
                        >
                          {candidate.status.replace("_", " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {candidate.candidateEmail} · {candidate.campaignTitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      {candidate.score !== null ? (
                        <div className="text-right">
                          <p className="text-xs font-semibold text-foreground tabular-nums">
                            {candidate.score}%
                          </p>
                          <p className="text-[10px] text-muted-foreground">Score</p>
                        </div>
                      ) : null}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs text-primary hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCandidate(candidate);
                        }}
                      >
                        Evidence
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8">
                <PortalEmptyState
                  icon={Users}
                  title="No candidates found"
                  description="Try adjusting your filter or search criteria to view matching candidates."
                />
              </div>
            )}
          </div>
        </PortalPanel>
      </div>

      {/* RIGHT SLIDE-OVER DRAWER: Candidate Evidence & Scorecard */}
      {selectedCandidate ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-xl flex-col border-l border-border bg-background shadow-2xl">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="min-w-0 space-y-1">
                <h2 className="text-lg font-semibold tracking-tight text-foreground truncate">
                  {selectedCandidate.candidateName}
                </h2>
                <p className="text-xs text-muted-foreground truncate">
                  {selectedCandidate.candidateEmail} · {selectedCandidate.campaignTitle}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-md p-0"
                onClick={() => setSelectedCandidate(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Scorecard Tile */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className={cn(portalPanelClass, "p-4 space-y-1")}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Assessment Score
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                    {selectedCandidate.score !== null ? `${selectedCandidate.score}%` : "Pending"}
                  </p>
                </div>
                <div className={cn(portalPanelClass, "p-4 space-y-1")}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Integrity Rating
                  </p>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {selectedCandidate.integrityScore}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Session Context */}
              <div className={cn(portalPanelClass, "p-4 space-y-2")}>
                <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Session Details
                </h4>
                <div className="text-xs text-foreground space-y-1">
                  <p><strong>Session:</strong> {selectedCandidate.sessionName || "Standard Assessment"}</p>
                  <p><strong>Submitted:</strong> {selectedCandidate.submittedAt ? new Date(selectedCandidate.submittedAt).toLocaleDateString() : "In Progress"}</p>
                </div>
              </div>

              {/* Shared Notes Panel */}
              <SharedCandidateNotesPanel
                sharedCandidateDocumentId={selectedCandidate.id}
                portal="hiring_manager"
              />
            </div>

            {/* Drawer Footer Actions */}
            <div className="border-t border-border bg-muted/20 p-4 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setSelectedCandidate(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
