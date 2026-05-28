"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, RefreshCw, UserCheck, Users } from "lucide-react";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignDetail,
} from "@/services/hiring-manager-portal-client.service";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";

type CandidateRow = {
  id: string;
  name: string;
  email?: string;
  status?: string;
  campaignId: string;
  campaignName: string;
  sessionName?: string;
  completedAssessments: number;
  totalAssessments: number;
  completion: number;
};

function buildCandidateRows(campaigns: HiringManagerCampaignDetail[]): CandidateRow[] {
  return campaigns.flatMap((campaign) =>
    campaign.joinedCandidates.map((candidate) => {
      const totalAssessments = Math.max(
        candidate.assessmentStack?.length ?? campaign.assessmentStack.length,
        candidate.results?.length ?? 0,
        1
      );
      const completedAssessments = candidate.results?.filter(
        (result) => result.completedAt || result.numericScore !== null
      ).length ?? 0;

      return {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        status: candidate.status,
        campaignId: candidate.campaignId ?? campaign.id,
        campaignName: candidate.campaignName ?? campaign.name,
        sessionName: candidate.sessionName,
        completedAssessments,
        totalAssessments,
        completion: Math.round((completedAssessments / totalAssessments) * 100),
      };
    })
  );
}

export function HiringManagerCandidatesView() {
  const [campaigns, setCampaigns] = useState<HiringManagerCampaignDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadCandidates = async (force = false) => {
    setIsRefreshing(true);
    setError(null);
    try {
      const campaignList = await HiringManagerPortalClientService.getCampaigns({ force });
      const details = await Promise.all(
        campaignList.map((campaign) =>
          HiringManagerPortalClientService.getCampaignDetail(campaign.id)
        )
      );
      setCampaigns(details.filter(Boolean) as HiringManagerCampaignDetail[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Candidates could not be loaded."
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadCandidates(false);
  }, []);

  const candidates = useMemo(() => buildCandidateRows(campaigns), [campaigns]);

  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Candidate view"
        title="Candidates"
        description="All joined candidates across active campaigns, with assessment progress and report access."
        icon={Users}
        stats={[
          { icon: UserCheck, label: `${candidates.length} candidate${candidates.length === 1 ? "" : "s"}` },
          { icon: RefreshCw, label: "Manual refresh" },
        ]}
        action={
          <Button
            type="button"
            variant="outline"
            onClick={() => loadCandidates(true)}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      {error && (
        <p className="rounded-md border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100">
          {error}
        </p>
      )}

      <div className="grid gap-3">
        {candidates.length === 0 ? (
          <Card className="rounded-[1.25rem] border border-dashed border-border bg-card shadow-sm dark:border-white/10 dark:bg-[#080c16]/50 dark:shadow-none">
            <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
              No candidates have joined a campaign session yet.
            </CardContent>
          </Card>
        ) : (
          candidates.map((candidate) => (
            <Card
              key={`${candidate.campaignId}-${candidate.id}`}
              className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none"
            >
              <CardContent className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(220px,0.8fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-base font-semibold leading-snug text-white">
                      {candidate.name}
                    </h2>
                    {candidate.status && (
                      <Badge className="rounded-md border-white/10 bg-white/[0.03] text-xs text-slate-300 hover:bg-white/[0.03]">
                        {candidate.status}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 break-words text-sm leading-5 text-slate-400">
                    {candidate.email || "Email not available"}
                  </p>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                    {candidate.campaignName}
                    {candidate.sessionName ? ` · ${candidate.sessionName}` : ""}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span>Completed assessments</span>
                    <span className="font-medium text-white">
                      {candidate.completedAssessments}/{candidate.totalAssessments}
                    </span>
                  </div>
                  <Progress value={candidate.completion} className="mt-3 h-2 bg-white/10" />
                </div>

                <Button
                  variant="outline"
                  className="h-9 rounded-md border-white/10 bg-white/[0.02] px-3 text-sm text-slate-100 hover:bg-white/[0.05]"
                  asChild
                >
                  <Link href={`/hiring-manager-dashboard/candidates/${candidate.id}/`}>
                    View results/report
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
