"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  KeyRound,
  RefreshCw,
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

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `Request failed with ${response.status}`);
  }
  return body as T;
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

  const loadDashboard = async () => {
    setLoading(true);
    const [summaryResponse, approvalsResponse, codesResponse, managersResponse] = await Promise.all([
      fetch("/api/client/dashboard", { cache: "no-store" }).then((response) =>
        readJson<{ data?: ClientDashboardSummary }>(response)
      ),
      fetch("/api/client/campaign-approvals", { cache: "no-store" }).then((response) =>
        readJson<{ data?: CampaignApproval[] }>(response)
      ),
      fetch("/api/client/access-codes", { cache: "no-store" }).then((response) =>
        readJson<{ data?: ClientAccessCode[] }>(response)
      ),
      fetch("/api/client/hiring-managers", { cache: "no-store" }).then((response) =>
        readJson<{ data?: ClientHiringManager[] }>(response)
      ),
    ]);

    setSummary(summaryResponse.data ?? null);
    setCampaigns(approvalsResponse.data ?? []);
    setAccessCodes(codesResponse.data ?? []);
    setHiringManagers(managersResponse.data ?? []);
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
      await loadDashboard();
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
        const updatedSeat = { ...seat, accessCode: body.data };
        setSelectedSeat(updatedSeat);
      }
      await loadDashboard();
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
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access code could not be refreshed");
    } finally {
      setCodeBusy(null);
    }
  };

  const seatPercent = summary?.seats.limit
    ? Math.min(100, Math.round((summary.seats.used / summary.seats.limit) * 100))
    : 0;

  return (
    <div className="space-y-8 max-w-6xl">
      <section className="space-y-4">
        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary">
          Client view
        </Badge>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-headline text-foreground">
            {summary?.client?.name ?? "Client workspace"}
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            Review hiring-manager capacity, campaign approvals, and candidate progression from one place.
          </p>
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hiring Manager Seats</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? `${summary.seats.used}/${summary.seats.limit}` : "..."}
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-secondary">
              <div className="h-full rounded-full bg-cyan-600" style={{ width: `${seatPercent}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {summary?.seats.available ?? 0} seat{summary?.seats.available === 1 ? "" : "s"} available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available HM Codes</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.availableAccessCodes ?? "..."}</div>
            <p className="text-xs text-muted-foreground">Unused hiring-manager invite codes</p>
          </CardContent>
        </Card>

        <Card>
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

      <Card>
        <CardHeader>
          <CardTitle>Hiring Managers</CardTitle>
          <CardDescription>
            Seat access and hiring-manager activity for this client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <p className="text-sm text-muted-foreground">Loading hiring-manager seats...</p>
          )}
          {!loading && seatSlots.length === 0 && (
            <p className="text-sm text-muted-foreground">No hiring-manager seats are available.</p>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {seatSlots.map((seat) => (
              <div key={seat.label} className="rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={seat.type === "occupied" ? "default" : "outline"}>
                        {seat.label}
                      </Badge>
                      {seat.type === "occupied" ? (
                        <span className="text-sm font-medium">Occupied</span>
                      ) : (
                        <span className="text-sm font-medium">Empty seat</span>
                      )}
                    </div>
                    {seat.type === "occupied" ? (
                      <>
                        <p className="truncate text-sm text-muted-foreground">
                          {seat.manager.name} • {seat.manager.email}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {seat.manager.campaigns.length} campaign{seat.manager.campaigns.length === 1 ? "" : "s"} • {seat.manager.candidatesOnboarded} candidates onboarded
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {seat.accessCode ? "Access code ready" : "No active access code"}
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
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

      <Card>
        <CardHeader>
          <CardTitle>Campaign Approval Queue</CardTitle>
          <CardDescription>
            Hiring managers can create sessions only after you approve the campaign.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && (
            <p className="text-sm text-muted-foreground">Loading campaign approvals...</p>
          )}
          {!loading && pendingCampaigns.length === 0 && (
            <p className="text-sm text-muted-foreground">No campaigns are pending approval.</p>
          )}
          {pendingCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex flex-col gap-4 rounded-md border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{campaign.name}</h2>
                  <Badge variant="outline">{campaign.deliveryMode}</Badge>
                  <Badge variant="secondary">{campaign.candidateCount} candidates</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {campaign.role} • Created by {campaign.createdBy}
                </p>
                <div className="flex flex-wrap gap-1">
                  {campaign.assessmentStack.map((assessment) => (
                    <Badge key={assessment} variant="secondary" className="text-xs">
                      {assessment}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={reviewingId === campaign.id}
                  onClick={() => reviewCampaign(campaign.id, "rejected")}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  disabled={reviewingId === campaign.id}
                  onClick={() => reviewCampaign(campaign.id, "approved")}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedSeat)} onOpenChange={(open) => !open && setSelectedSeat(null)}>
        <DialogContent>
          {selectedSeat?.type === "empty" && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedSeat.label} Access Code</DialogTitle>
                <DialogDescription>
                  Share this code with the hiring manager assigned to this seat.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-md border bg-muted/40 p-4">
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
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Campaigns</p>
                    <p className="text-2xl font-semibold">{selectedSeat.manager.campaigns.length}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-xs text-muted-foreground">Candidates onboarded</p>
                    <p className="text-2xl font-semibold">{selectedSeat.manager.candidatesOnboarded}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedSeat.manager.campaigns.length === 0 && (
                    <p className="text-sm text-muted-foreground">No campaigns are attached to this hiring manager.</p>
                  )}
                  {selectedSeat.manager.campaigns.map((campaign) => (
                    <div key={campaign.documentId} className="rounded-md border p-3">
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
