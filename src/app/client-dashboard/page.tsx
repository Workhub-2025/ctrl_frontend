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
  status: "active" | "previous";
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
  const [releasingManagerId, setReleasingManagerId] = useState<string | null>(null);
  const [approvalModeBusy, setApprovalModeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.approvalStatus === "Pending approval"),
    [campaigns]
  );

  const activeHiringManagers = useMemo(
    () => hiringManagers.filter((manager) => manager.status !== "previous"),
    [hiringManagers]
  );

  const previousHiringManagers = useMemo(
    () => hiringManagers.filter((manager) => manager.status === "previous"),
    [hiringManagers]
  );

  const seatSlots = useMemo<SeatSlot[]>(() => {
    const occupied = activeHiringManagers.map((manager, index) => ({
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
  }, [accessCodes, activeHiringManagers, summary?.seats.limit]);

  const loadDashboard = async (force = false) => {
    const startTime = Date.now();
    setLoading(true);
    setError(null);
    try {
      const overview = await getClientOverview(force);
      setSummary(overview.summary);
      setCampaigns(overview.campaigns);
      setAccessCodes(overview.accessCodes);
      setHiringManagers(overview.hiringManagers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Client dashboard could not be loaded");
    } finally {
      if (force) {
        const elapsedTime = Date.now() - startTime;
        const minSpin = 800; // ms to ensure smooth spin
        if (elapsedTime < minSpin) {
          await new Promise((resolve) => setTimeout(resolve, minSpin - elapsedTime));
        }
      }
      setLoading(false);
    }
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

  const releaseHiringManager = async (manager: ClientHiringManager) => {
    setReleasingManagerId(manager.documentId);
    setError(null);
    try {
      await fetch(`/api/client/hiring-managers/${encodeURIComponent(manager.documentId)}/release`, {
        method: "POST",
      }).then((response) => readJson(response));

      overviewCache = null;
      setSelectedSeat(null);
      await loadDashboard(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiring-manager seat could not be released");
    } finally {
      setReleasingManagerId(null);
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
    <div className="relative max-w-7xl space-y-6">
      {/* Decorative background glows */}
      <div className="absolute top-0 right-1/4 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/4 -z-10 h-96 w-96 rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />

      <HiringManagerPageHeader
        eyebrow="Client workspace"
        title={summary?.client?.name ?? "Client Portal"}
        description="Review hiring-manager capacity, campaign approvals, and candidate progression from one place."
        icon={Building2}
        notice={
          error ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-relaxed text-red-200">
              {error}
            </p>
          ) : null
        }
        action={
          <Button type="button" variant="outline" className="h-9 border-border hover:!bg-white/10 hover:!text-white dark:border-white/10 dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none" onClick={() => void loadDashboard(true)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-sm dark:border-white/10 dark:bg-[#0b1329]/40 dark:backdrop-blur-md dark:shadow-2xl">
          <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-primary/5 blur-xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-400">Hiring Manager Seats</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Users className="h-4 w-4" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-foreground">
              {summary ? `${summary.seats.used}/${summary.seats.limit}` : "…"}
            </div>
            <Progress value={seatPercent} className="mt-3 h-2 bg-muted dark:bg-white/10" />
            <p className="mt-3 text-xs text-slate-400">
              {summary?.seats.available ?? 0} seat{summary?.seats.available === 1 ? "" : "s"} available
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-sm dark:border-white/10 dark:bg-[#0b1329]/40 dark:backdrop-blur-md dark:shadow-2xl">
          <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-cyan-500/5 blur-xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-400">Available invites</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-foreground">{summary?.availableAccessCodes ?? "…"}</div>
            <p className="mt-3 text-xs text-slate-400">Unused hiring-manager invite codes</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-sm dark:border-white/10 dark:bg-[#0b1329]/40 dark:backdrop-blur-md dark:shadow-2xl">
          <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full bg-orange-500/5 blur-xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-slate-400">Campaign Approvals</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 text-orange-400">
              <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="text-3xl font-extrabold text-foreground">{summary?.campaignsPendingApproval ?? "…"}</div>
            <p className="mt-3 text-xs text-slate-400">Campaigns waiting for your review</p>
          </CardContent>
        </Card>
      </div>

      <Card className="relative overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-sm dark:border-white/10 dark:bg-[#0b1329]/40 dark:backdrop-blur-md dark:shadow-2xl">
        <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-border/50 dark:border-white/5 pb-5">
          <div>
            <CardTitle className="text-xl font-bold">Hiring Managers</CardTitle>
            <CardDescription className="text-slate-400">
              Seat access and hiring-manager activity for this client.
            </CardDescription>
          </div>
          <Badge className="w-fit rounded-lg border-primary/20 bg-primary/15 text-primary hover:bg-primary/20 px-3 py-1 font-semibold">
            {summary?.seats.available ?? 0} open seat{summary?.seats.available === 1 ? "" : "s"}
          </Badge>
        </CardHeader>
        <CardContent className="pt-6">
          {loading && (
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" aria-hidden="true" /> Loading hiring-manager seats…
            </p>
          )}
          {!loading && seatSlots.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-background/50 p-6 text-sm text-slate-400 dark:border-white/10 dark:bg-white/[0.01]">
              No hiring-manager seats are available.
            </div>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            {seatSlots.map((seat) => (
              <div
                key={seat.label}
                className="relative overflow-hidden rounded-xl border border-border bg-background/50 p-5 shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-slate-400 dark:border-white/10 dark:bg-[#0b1220]/50 hover:dark:border-white/30"
              >
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={seat.type === "occupied" ? "rounded-lg bg-primary text-primary-foreground font-semibold px-2.5 py-0.5" : "rounded-lg border-border bg-card text-slate-400 hover:bg-card px-2.5 py-0.5"}>
                        {seat.label}
                      </Badge>
                      <Badge
                        className={
                          seat.type === "occupied"
                            ? "rounded-lg border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 font-semibold px-2.5 py-0.5"
                            : "rounded-lg border-cyan-500/20 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/10 font-semibold px-2.5 py-0.5"
                        }
                      >
                        {seat.type === "occupied" ? "Occupied" : "Empty seat"}
                      </Badge>
                    </div>

                    {seat.type === "occupied" ? (
                      <div className="space-y-1">
                        <h2 className="break-words text-lg font-bold text-foreground">
                          {seat.manager.name}
                        </h2>
                        <p className="break-words text-sm text-slate-400">
                          {seat.manager.email}
                        </p>
                        <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
                        <h2 className="text-lg font-bold text-foreground">
                          {seat.accessCode ? "Access code ready" : "No active access code"}
                        </h2>
                        <p className="text-sm text-slate-400">
                          {seat.accessCode
                             ? `Expires ${formatDateTime(seat.accessCode.expiresAt)}`
                            : "Generate a controlled access code for this seat."}
                        </p>
                        <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-3 text-xs text-slate-400 dark:border-white/5 dark:bg-[#04070d]/40">
                          <KeyRound className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                          <span>Codes expire after 7 days or when refreshed.</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto h-10 border-white/10 hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
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
                      <UserCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    {seat.type === "occupied" ? "View details" : codeBusy === seat.label ? "Loading…" : "View Access Code"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {!loading && previousHiringManagers.length > 0 && (
            <div className="mt-6 border-t border-border/50 pt-5 dark:border-white/5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Previous seat occupants</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    Retained for historical campaigns and candidate records only.
                  </p>
                </div>
                <Badge variant="outline" className="rounded-lg border-border bg-card text-slate-400 dark:border-white/10">
                  {previousHiringManagers.length} previous
                </Badge>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {previousHiringManagers.map((manager) => (
                  <button
                    key={manager.documentId}
                    type="button"
                    onClick={() => setSelectedSeat({ type: "occupied", label: "Previous", manager })}
                    className="rounded-xl border border-border bg-background/40 p-4 text-left transition-colors hover:border-slate-400 dark:border-white/10 dark:bg-[#0b1220]/40 hover:dark:border-white/30"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{manager.name}</p>
                        <p className="truncate text-xs text-slate-400">{manager.email}</p>
                      </div>
                      <Badge variant="outline" className="rounded-md border-slate-500/20 text-slate-400">
                        Previous
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <MiniPanel label="Campaigns" value={manager.campaigns.length} icon={BriefcaseBusiness} />
                      <MiniPanel label="Candidates" value={manager.candidatesOnboarded} icon={UserCheck} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden rounded-[1.25rem] border border-border bg-card shadow-sm dark:border-white/10 dark:bg-[#0b1329]/40 dark:backdrop-blur-md dark:shadow-2xl">
        <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-border/50 dark:border-white/5 pb-5">
          <div>
            <CardTitle className="text-xl font-bold">Campaign Approval Queue</CardTitle>
            <CardDescription className="text-slate-400">
              Choose whether new campaigns need client review before sessions can be created.
            </CardDescription>
          </div>
          <ApprovalModeControl
            mode={summary?.client?.campaignApprovalMode ?? "require_approval"}
            disabled={loading || approvalModeBusy || !summary?.client?.documentId}
            onChange={(checked) => void updateApprovalMode(checked)}
          />
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {loading && (
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-primary" aria-hidden="true" /> Loading campaign approvals…
            </p>
          )}
          {!loading && pendingCampaigns.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-background/50 p-6 text-sm text-slate-400 dark:border-white/10 dark:bg-white/[0.01]">
              No campaigns are pending approval.
            </div>
          )}
          {pendingCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="rounded-xl border border-border bg-background/50 p-5 shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-slate-400 dark:border-white/10 dark:bg-[#0b1220]/50 hover:dark:border-white/30"
            >
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-lg border-orange-500/20 bg-orange-500/10 text-orange-400 hover:bg-orange-500/10 font-semibold px-2.5 py-0.5">
                      Pending approval
                    </Badge>
                    <Badge className="rounded-lg border-border bg-card text-xs text-slate-400 hover:bg-card dark:border-white/5 dark:bg-white/[0.03] px-2.5 py-0.5">
                      {campaign.deliveryMode}
                    </Badge>
                    <Badge className="rounded-lg border-border bg-card text-xs text-slate-400 hover:bg-card dark:border-white/5 dark:bg-white/[0.03] px-2.5 py-0.5">
                      {campaign.candidateCount} candidates
                    </Badge>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h2 className="break-words text-lg font-bold text-foreground">
                      {campaign.name}
                    </h2>
                    <p className="text-sm text-slate-400">
                      {campaign.role} | Created by {campaign.createdBy}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-card/60 p-4 shadow-inner dark:border-white/5 dark:bg-[#04070d]/50">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Assessment stack
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {campaign.assessmentStack.length === 0 ? (
                        <span className="text-xs text-slate-400">No assessments attached</span>
                      ) : (
                        campaign.assessmentStack.map((assessment) => (
                          <span
                            key={assessment}
                            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground dark:border-white/5 dark:bg-white/[0.04]"
                          >
                            {assessment}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-card/60 p-4 shadow-inner dark:border-white/5 dark:bg-[#04070d]/50">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <AlertCircle className="h-4 w-4 text-orange-400" aria-hidden="true" />
                      Review required
                    </div>
                    <p className="text-xs leading-relaxed text-slate-400">
                      Approving unlocks session creation for this campaign.
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <Button
                      disabled={reviewingId === campaign.id}
                      onClick={() => reviewCampaign(campaign.id, "approved")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      disabled={reviewingId === campaign.id}
                      onClick={() => reviewCampaign(campaign.id, "rejected")}
                      className="border-red-500/20 hover:!border-red-500/50 hover:!bg-red-500/10 hover:!text-red-400 text-red-500 gap-2 font-semibold bg-transparent transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      <XCircle className="h-4 w-4" aria-hidden="true" />
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
        <DialogContent className="rounded-[1.25rem] border border-border dark:border-white/10 dark:bg-[#0a0f1d] max-w-md">
          {selectedSeat?.type === "empty" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{selectedSeat.label} Access Code</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Share this code with the hiring manager assigned to this seat.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 pt-3">
                <div className="relative overflow-hidden rounded-xl border border-border bg-muted/40 p-5 dark:border-white/10 dark:bg-white/[0.02] shadow-inner">
                  <div className="absolute top-0 right-0 h-16 w-16 bg-primary/10 blur-xl pointer-events-none" />
                  <p className="break-all font-mono text-2xl font-bold tracking-widest text-primary text-center">
                    {selectedSeat.accessCode?.code ?? "No code available"}
                  </p>
                </div>
                <div className="grid gap-1.5 text-xs text-slate-400">
                  <p>
                    Last refresh: {formatDateTime(selectedSeat.accessCode?.updatedAt ?? selectedSeat.accessCode?.createdAt)}
                  </p>
                  <p>Expires: {formatDateTime(selectedSeat.accessCode?.expiresAt)}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-white/10 hover:!bg-white/10 hover:!text-white dark:hover:!bg-white/[0.08] dark:hover:!text-white gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  onClick={() => void refreshSeatCode(selectedSeat)}
                  disabled={!selectedSeat.accessCode || codeBusy === selectedSeat.label}
                >
                  <RefreshCw className={`h-4 w-4 ${codeBusy === selectedSeat.label ? "animate-spin" : ""}`} aria-hidden="true" />
                  {codeBusy === selectedSeat.label ? "Refreshing…" : "Refresh code"}
                </Button>
              </div>
            </>
          )}
          {selectedSeat?.type === "occupied" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{selectedSeat.manager.name}</DialogTitle>
                <DialogDescription className="text-slate-400">{selectedSeat.manager.email}</DialogDescription>
              </DialogHeader>
              <div className="space-y-5 pt-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/30 p-4 dark:border-white/10 dark:bg-white/[0.02] shadow-inner">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Campaigns</p>
                    <p className="text-3xl font-extrabold text-foreground mt-1">{selectedSeat.manager.campaigns.length}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 dark:border-white/10 dark:bg-white/[0.02] shadow-inner">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Onboarded</p>
                    <p className="text-3xl font-extrabold text-foreground mt-1">{selectedSeat.manager.candidatesOnboarded}</p>
                  </div>
                </div>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {selectedSeat.manager.campaigns.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-4">No campaigns are attached to this hiring manager.</p>
                  )}
                  {selectedSeat.manager.campaigns.map((campaign) => (
                    <div key={campaign.documentId} className="rounded-xl border border-border bg-background/40 p-4 transition-colors hover:border-primary/20 dark:border-white/5 dark:bg-white/[0.02] space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{campaign.name}</p>
                          <p className="text-xs text-slate-400 truncate">{campaign.jobRole}</p>
                        </div>
                        <BriefcaseBusiness className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-md text-slate-400 border-border dark:border-white/5">{campaign.campaignStatus}</Badge>
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-md text-slate-300 dark:bg-white/5">{campaign.approvalStatus}</Badge>
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 rounded-md text-slate-300 dark:bg-white/5">{campaign.candidatesOnboarded} candidates</Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedSeat.manager.status !== "previous" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-orange-500/20 text-orange-500 hover:!border-orange-500/50 hover:!bg-orange-500/10 hover:!text-orange-500"
                    onClick={() => void releaseHiringManager(selectedSeat.manager)}
                    disabled={releasingManagerId === selectedSeat.manager.documentId}
                  >
                    {releasingManagerId === selectedSeat.manager.documentId ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    {releasingManagerId === selectedSeat.manager.documentId ? "Releasing seat..." : "Release seat"}
                  </Button>
                )}
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
    <div className="rounded-xl border border-border bg-background/50 p-3 shadow-inner transition-colors dark:border-white/5 dark:bg-[#0b1220]/40">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
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
    <div className="rounded-xl border border-border bg-card/60 p-3 shadow-inner dark:border-white/5 dark:bg-[#04070d]/50">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-1 text-lg font-bold text-foreground">{value}</p>
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
    <div className="w-full rounded-xl border border-border bg-background/50 p-4 shadow-inner dark:border-white/10 dark:bg-[#0b1220]/40 sm:w-[320px]">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {isAutoApprove ? "Auto approve campaigns" : "Client reviews campaigns"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
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
