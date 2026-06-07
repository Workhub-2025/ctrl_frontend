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
  CheckCircle2,
  ClipboardCheck,
  KeyRound,
  Users,
  XCircle,
} from "lucide-react";

type ClientDashboardSummary = {
  client?: {
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
};

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
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<ClientAccessCode | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingCampaigns = useMemo(
    () => campaigns.filter((campaign) => campaign.approvalStatus === "Pending approval"),
    [campaigns]
  );

  const loadDashboard = async () => {
    setLoading(true);
    const [summaryResponse, approvalsResponse] = await Promise.all([
      fetch("/api/client/dashboard", { cache: "no-store" }).then((response) =>
        readJson<{ data?: ClientDashboardSummary }>(response)
      ),
      fetch("/api/client/campaign-approvals", { cache: "no-store" }).then((response) =>
        readJson<{ data?: CampaignApproval[] }>(response)
      ),
    ]);

    setSummary(summaryResponse.data ?? null);
    setCampaigns(approvalsResponse.data ?? []);
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

  const generateHmCode = async () => {
    setGeneratingCode(true);
    setError(null);
    try {
      const body = await fetch("/api/client/access-codes", {
        method: "POST",
      }).then((response) => readJson<{ data?: ClientAccessCode }>(response));
      setGeneratedCode(body.data ?? null);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access code could not be generated");
    } finally {
      setGeneratingCode(false);
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
      {generatedCode?.code && (
        <div className="rounded-md border border-cyan-500/30 bg-cyan-500/5 px-4 py-3 text-sm">
          <p className="font-medium">Hiring manager access code generated</p>
          <p className="mt-2 font-mono text-base tracking-wide">{generatedCode.code}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Expires {new Date(generatedCode.expiresAt).toLocaleString("en-GB")}. This code is shown once.
          </p>
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
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full"
              onClick={generateHmCode}
              disabled={generatingCode || (summary?.seats.available ?? 0) < 1}
            >
              <KeyRound className="mr-2 h-4 w-4" />
              {generatingCode ? "Generating..." : "Generate HM code"}
            </Button>
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
    </div>
  );
}
