"use client";

import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import {
  AlertCircle,
  Building2,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

type ClientDashboardSummary = {
  client?: {
    documentId?: string;
    name?: string;
    campaignApprovalMode?: "auto_approve" | "require_approval";
  };
  seats: {
    limit: number;
    used: number;
    available: number;
  };
  availableAccessCodes: number;
  candidatesPendingReview: number;
  campaignsPendingApproval: number;
};

type CampaignApproval = {
  id: string;
  name: string;
  role: string;
  approvalStatus?: "Pending approval" | "Approved" | "Rejected";
  deliveryMode: "In-person" | "Remote" | "Hybrid";
  candidateCount: number;
  sessions: number;
  assessmentStack: string[];
  createdBy: string;
  createdAt?: string;
};

type ClientAccessCode = {
  documentId: string;
  code?: string;
  expiresAt: string;
  status: string;
  targetRole: string;
  createdAt?: string;
  updatedAt?: string;
};

type ClientHiringManager = {
  documentId: string;
  name: string;
  email: string;
  createdAt?: string;
  candidatesOnboarded: number;
  campaigns: Array<{
    documentId: string;
    name: string;
    jobRole: string;
    campaignStatus: string;
    approvalStatus: string;
    candidatesOnboarded: number;
  }>;
};

type SeatSlot =
  | { type: "occupied"; label: string; manager: ClientHiringManager }
  | { type: "empty"; label: string; accessCode?: ClientAccessCode };

type ClientOverviewData = {
  summary: ClientDashboardSummary | null;
  campaigns: CampaignApproval[];
  accessCodes: ClientAccessCode[];
  hiringManagers: ClientHiringManager[];
};

const OVERVIEW_CACHE_TTL_MS = 30_000;
let overviewCache: { data: ClientOverviewData; timestamp: number } | null = null;
let overviewInFlight: Promise<ClientOverviewData> | null = null;

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Request failed with ${response.status}`);
  }
  return body as T;
}

async function getClientOverview(force = false) {
  const now = Date.now();
  if (!force && overviewCache && now - overviewCache.timestamp < OVERVIEW_CACHE_TTL_MS) {
    return overviewCache.data;
  }

  if (!force && overviewInFlight) {
    return overviewInFlight;
  }

  overviewInFlight = fetch("/api/client/overview", { cache: "no-store" })
    .then((response) => readJson<{ data?: ClientOverviewData }>(response))
    .then((body) => {
      if (!body.data) {
        throw new Error("Client overview could not be loaded");
      }
      overviewCache = { data: body.data, timestamp: Date.now() };
      return body.data;
    })
    .finally(() => {
      overviewInFlight = null;
    });

  return overviewInFlight;
}

export default function ClientDashboardPage() {
  const [summary, setSummary] = useState<ClientDashboardSummary | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignApproval[]>([]);
  const [accessCodes, setAccessCodes] = useState<ClientAccessCode[]>([]);
  const [hiringManagers, setHiringManagers] = useState<ClientHiringManager[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<SeatSlot | null>(null);
  const [codeBusy, setCodeBusy] = useState<string | null>(null);
  const [approvalModeBusy, setApprovalModeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.approvalStatus === "Pending approval"),
    [campaigns]
  );

  const seatSlots = useMemo<SeatSlot[]>(() => {
    const occupied = hiringManagers.map((manager, index) => ({
      type: "occupied" as const,
      label: `Seat ${index + 1}`,
      manager,
    }));
    const emptyCount = Math.max(0, (summary?.seats.limit ?? 0) - occupied.length);
    const empty = Array.from({ length: emptyCount }, (_, index) => ({
      type: "empty" as const,
      label: `Seat ${occupied.length + index + 1}`,
      accessCode: accessCodes[index],
    }));

    return [...occupied, ...empty];
  }, [accessCodes, hiringManagers, summary?.seats.limit]);

  const loadDashboard = async (force = false) => {
    setLoading(true);
    const overview = await getClientOverview(force);

    setSummary(overview.summary);
    setCampaigns(overview.campaigns);
    setAccessCodes(overview.accessCodes);
    setHiringManagers(overview.hiringManagers);
    setError(null);
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;
    loadDashboard().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : "Client dashboard could not be loaded");
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const reviewCampaign = async (campaignId: string, decision: "approved" | "rejected") => {
    setReviewingId(campaignId);
    try {
      await fetch(`/api/client/campaign-approvals/${campaignId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      }).then((response) => readJson(response));
      await loadDashboard(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign could not be reviewed");
    } finally {
      setReviewingId(null);
    }
  };

  const openEmptySeat = async (seat: Extract<SeatSlot, { type: "empty" }>) => {
    setError(null);
    if (seat.accessCode?.code) {
      setSelectedSeat(seat);
      return;
    }

    setCodeBusy(seat.label);
    try {
      const body = await fetch("/api/client/access-codes", {
        method: "POST",
      }).then((response) => readJson<{ data?: ClientAccessCode }>(response));
      if (body.data) {
        setSelectedSeat({ ...seat, accessCode: body.data });
      }
      await loadDashboard(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access code could not be generated");
    } finally {
      setCodeBusy(null);
    }
  };

  const refreshSeatCode = async (seat: Extract<SeatSlot, { type: "empty" }>) => {
    if (!seat.accessCode?.documentId) return;

    setCodeBusy(seat.label);
    setError(null);
    try {
      const body = await fetch("/api/client/access-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshCodeDocumentId: seat.accessCode.documentId }),
      }).then((response) => readJson<{ data?: ClientAccessCode }>(response));

      if (body.data) {
        setSelectedSeat({ ...seat, accessCode: body.data });
      }
      await loadDashboard(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access code could not be refreshed");
    } finally {
      setCodeBusy(null);
    }
  };

  const updateApprovalMode = async (checked: boolean) => {
    const nextMode = checked ? "auto_approve" : "require_approval";
    const previousSummary = summary;
    const clientDocumentId = summary?.client?.documentId;

    if (!clientDocumentId) {
      setError("Client account could not be resolved");
      return;
    }

    setApprovalModeBusy(true);
    setError(null);
    setSummary((current) =>
      current?.client
        ? {
            ...current,
            client: {
              ...current.client,
              campaignApprovalMode: nextMode,
            },
          }
        : current
    );

    try {
      await fetch("/api/client/approval-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientDocumentId, mode: nextMode }),
      }).then((response) => readJson(response));

      if (overviewCache?.data.summary?.client) {
        overviewCache = {
          data: {
            ...overviewCache.data,
            summary: {
              ...overviewCache.data.summary,
              client: {
                ...overviewCache.data.summary.client,
                campaignApprovalMode: nextMode,
              },
            },
          },
          timestamp: Date.now(),
        };
      }
    } catch (err) {
      setSummary(previousSummary);
      setError(err instanceof Error ? err.message : "Campaign approval mode could not be updated");
    } finally {
      setApprovalModeBusy(false);
    }
  };

  const seatPercent = summary?.seats.limit
    ? Math.min(100, Math.round((summary.seats.used / summary.seats.limit) * 100))
    : 0;

  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Client workspace"
        title={summary?.client?.name ?? "Client Portal"}
        description="Review hiring-manager capacity, campaign approvals, and candidate progression from one place."
        icon={Building2}
        stats={[
          { icon: Users, label: "Seat oversight" },
          { icon: ClipboardCheck, label: "Campaign approvals" },
          { icon: ShieldCheck, label: "Controlled access" },
        ]}
        notice={
          error ? (
            <p className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-700 dark:text-amber-100">
              {error}
            </p>
          ) : null
        }
        action={
          <div className="grid w-full gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <HeaderMetric
              icon={Users}
              label="Seats used"
              value={summary ? `${summary.seats.used}/${summary.seats.limit}` : "..."}
            />
            <HeaderMetric
              icon={KeyRound}
              label="Active codes"
              value={summary?.availableAccessCodes ?? "..."}
            />
            <HeaderMetric
              icon={ClipboardCheck}
              label="Pending approvals"
              value={summary?.campaignsPendingApproval ?? "..."}
            />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-[1.25rem] border border-border bg-card shadow-sm dark:border-white/5 dark:bg-[#080c16]/70 dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hiring Manager Seats</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? `${summary.seats.used}/${summary.seats.limit}` : "..."}
            </div>
            <Progress value={seatPercent} className="mt-3 h-2 bg-muted dark:bg-white/10" />
            <p className="mt-2 text-xs text-muted-foreground">
              {summary?.seats.available ?? 0} seat{summary?.seats.available === 1 ? "" : "s"} available
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[1.25rem] border border-border bg-card shadow-sm dark:border-white/5 dark:bg-[#080c16]/70 dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available HM Codes</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.availableAccessCodes ?? "..."}</div>
            <p className="text-xs text-muted-foreground">Unused hiring-manager invite codes</p>
          </CardContent>
        </Card>

        <Card className="rounded-[1.25rem] border border-border bg-card shadow-sm dark:border-white/5 dark:bg-[#080c16]/70 dark:shadow-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaign Approvals</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.campaignsPendingApproval ?? "..."}</div>
            <p className="text-xs text-muted-foreground">Waiting for your decision</p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[1.25rem] border border-border bg-card shadow-sm dark:border-white/5 dark:bg-[#080c16]/70 dark:shadow-none">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Hiring Managers</CardTitle>
            <CardDescription>
              Seat access and hiring-manager activity for this client.
            </CardDescription>
          </div>
          <Badge className="w-fit rounded-md border-primary/20 bg-primary/10 text-primary hover:bg-primary/10">
            {summary?.seats.available ?? 0} open seat{summary?.seats.available === 1 ? "" : "s"}
          </Badge>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">Loading hiring-manager seats...</p>
          )}
          {!loading && seatSlots.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-background p-5 text-sm leading-6 text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]">
              No hiring-manager seats are available.
            </div>
          )}
          <div className="grid gap-3 lg:grid-cols-2">
            {seatSlots.map((seat) => (
              <div
                key={seat.label}
                className="rounded-xl border border-border bg-background p-4 shadow-sm transition-colors hover:border-primary/30 dark:border-white/5 dark:bg-white/[0.03]"
              >
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={seat.type === "occupied" ? "rounded-md bg-primary text-primary-foreground" : "rounded-md border-border bg-card text-muted-foreground hover:bg-card"}>
                        {seat.label}
                      </Badge>
                      <Badge
                        className={
                          seat.type === "occupied"
                            ? "rounded-md border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10"
                            : "rounded-md border-cyan-500/20 bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/10"
                        }
                      >
                        {seat.type === "occupied" ? "Occupied" : "Empty seat"}
                      </Badge>
                    </div>

                    {seat.type === "occupied" ? (
                      <div className="space-y-1">
                        <h2 className="break-words text-base font-semibold leading-snug text-foreground">
                          {seat.manager.name}
                        </h2>
                        <p className="break-words text-sm leading-5 text-muted-foreground">
                          {seat.manager.email}
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <MiniPanel
                            label="Campaigns"
                            value={seat.manager.campaigns.length}
                            icon={BriefcaseBusiness}
                          />
                          <MiniPanel
                            label="Candidates"
                            value={seat.manager.candidatesOnboarded}
                            icon={UserCheck}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <h2 className="text-base font-semibold leading-snug text-foreground">
                          {seat.accessCode ? "Access code ready" : "No active access code"}
                        </h2>
                        <p className="text-sm leading-5 text-muted-foreground">
                          {seat.accessCode
                            ? `Expires ${formatDateTime(seat.accessCode.expiresAt)}`
                            : "Generate a controlled access code for this seat."}
                        </p>
                        <div className="mt-3 rounded-xl border border-border bg-card p-3 text-xs leading-5 text-muted-foreground dark:border-white/10 dark:bg-[#04070d]">
                          <KeyRound className="mb-2 h-4 w-4 text-primary" />
                          Codes expire after 7 days or immediately when refreshed.
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => {
                      if (seat.type === "occupied") {
                        setSelectedSeat(seat);
                      } else {
                        void openEmptySeat(seat);
                      }
                    }}
                    disabled={seat.type === "empty" && codeBusy === seat.label}
                  >
                    {seat.type === "occupied" ? (
                      <UserCheck className="mr-2 h-4 w-4" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" />
                    )}
                    {seat.type === "occupied" ? "View details" : codeBusy === seat.label ? "Loading..." : "View Access Code"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[1.25rem] border border-border bg-card shadow-sm dark:border-white/5 dark:bg-[#080c16]/70 dark:shadow-none">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Campaign Approval Queue</CardTitle>
            <CardDescription>
              Choose whether new campaigns need client review before sessions can be created.
            </CardDescription>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:items-end">
            <ApprovalModeControl
              mode={summary?.client?.campaignApprovalMode ?? "require_approval"}
              disabled={loading || approvalModeBusy || !summary?.client?.documentId}
              onChange={(checked) => void updateApprovalMode(checked)}
            />
            <Button type="button" variant="outline" onClick={() => void loadDashboard(true)} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && (
            <p className="text-sm text-muted-foreground">Loading campaign approvals...</p>
          )}
          {!loading && pendingCampaigns.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-background p-5 text-sm leading-6 text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]">
              No campaigns are pending approval.
            </div>
          )}
          {pendingCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="rounded-xl border border-border bg-background p-4 shadow-sm transition-colors hover:border-primary/30 dark:border-white/5 dark:bg-white/[0.03]"
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-md border-orange-500/20 bg-orange-500/10 text-orange-600 hover:bg-orange-500/10">
                      Pending approval
                    </Badge>
                    <Badge className="rounded-md border-border bg-card text-xs text-muted-foreground hover:bg-card dark:border-white/10 dark:bg-white/[0.03]">
                      {campaign.deliveryMode}
                    </Badge>
                    <Badge className="rounded-md border-border bg-card text-xs text-muted-foreground hover:bg-card dark:border-white/10 dark:bg-white/[0.03]">
                      {campaign.candidateCount} candidates
                    </Badge>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="break-words text-base font-semibold leading-snug text-foreground">
                      {campaign.name}
                    </h2>
                    <p className="text-sm leading-5 text-muted-foreground">
                      {campaign.role} | Created by {campaign.createdBy}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 shadow-sm dark:border-white/10 dark:bg-[#04070d]">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      Assessment stack
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {campaign.assessmentStack.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No assessments attached</span>
                      ) : (
                        campaign.assessmentStack.map((assessment) => (
                          <span
                            key={assessment}
                            className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground dark:border-white/10 dark:bg-white/[0.03]"
                          >
                            {assessment}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-sm dark:border-white/10 dark:bg-[#04070d]">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      Review required
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Approving unlocks session creation for this campaign.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Button
                      disabled={reviewingId === campaign.id}
                      onClick={() => reviewCampaign(campaign.id, "approved")}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      disabled={reviewingId === campaign.id}
                      onClick={() => reviewCampaign(campaign.id, "rejected")}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedSeat)} onOpenChange={(open) => !open && setSelectedSeat(null)}>
        <DialogContent className="rounded-[1.25rem] border-border dark:border-white/10">
          {selectedSeat?.type === "empty" && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSeat.label} Access Code</DialogTitle>
                <DialogDescription>
                  Share this code with the hiring manager assigned to this seat.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-muted/40 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                  <p className="break-all font-mono text-lg font-semibold tracking-wide">
                    {selectedSeat.accessCode?.code ?? "No code available"}
                  </p>
                </div>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <p>
                    Last refresh: {formatDateTime(selectedSeat.accessCode?.updatedAt ?? selectedSeat.accessCode?.createdAt)}
                  </p>
                  <p>Expires: {formatDateTime(selectedSeat.accessCode?.expiresAt)}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void refreshSeatCode(selectedSeat)}
                  disabled={!selectedSeat.accessCode || codeBusy === selectedSeat.label}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {codeBusy === selectedSeat.label ? "Refreshing..." : "Refresh code"}
                </Button>
              </div>
            </>
          )}
          {selectedSeat?.type === "occupied" && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSeat.manager.name}</DialogTitle>
                <DialogDescription>{selectedSeat.manager.email}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/30 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs text-muted-foreground">Campaigns</p>
                    <p className="text-2xl font-semibold">{selectedSeat.manager.campaigns.length}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs text-muted-foreground">Candidates onboarded</p>
                    <p className="text-2xl font-semibold">{selectedSeat.manager.candidatesOnboarded}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedSeat.manager.campaigns.length === 0 && (
                    <p className="text-sm text-muted-foreground">No campaigns are attached to this hiring manager.</p>
                  )}
                  {selectedSeat.manager.campaigns.map((campaign) => (
                    <div key={campaign.documentId} className="rounded-xl border border-border p-3 dark:border-white/10">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{campaign.name}</p>
                          <p className="text-sm text-muted-foreground">{campaign.jobRole}</p>
                        </div>
                        <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">{campaign.campaignStatus}</Badge>
                        <Badge variant="secondary">{campaign.approvalStatus}</Badge>
                        <Badge variant="secondary">{campaign.candidatesOnboarded} candidates</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function HeaderMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-3 shadow-sm dark:border-white/5 dark:bg-white/[0.03]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MiniPanel({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm dark:border-white/10 dark:bg-[#04070d]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ApprovalModeControl({
  mode,
  disabled,
  onChange,
}: {
  mode: "auto_approve" | "require_approval";
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  const isAutoApprove = mode === "auto_approve";

  return (
    <div className="w-full rounded-xl border border-border bg-background p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.03] sm:w-[320px]">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            {isAutoApprove ? "Auto approve campaigns" : "Client reviews campaigns"}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Applies to campaigns created after this setting changes.
          </p>
        </div>
        <Switch
          checked={isAutoApprove}
          disabled={disabled}
          onCheckedChange={onChange}
          aria-label="Toggle campaign auto approval"
        />
      </div>
    </div>
  );
}

function formatDateTime(value?: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
