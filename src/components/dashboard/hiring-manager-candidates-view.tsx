"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Filter, RefreshCw, UserCheck, Users } from "lucide-react";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignDetail,
} from "@/services/hiring-manager-portal-client.service";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";

type CandidateRow = {
  id: string;
  candidateSessionId: string;
  name: string;
  email?: string;
  status?: string;
  campaignId: string;
  campaignName: string;
  sessionName: string;
  progress: "completed" | "in_progress" | "not_started";
  completedAssessments: number;
  totalAssessments: number;
  completion: number;
};

function buildCandidateRows(campaigns: HiringManagerCampaignDetail[]): CandidateRow[] {
  const rows: CandidateRow[] = [];

  for (const campaign of campaigns) {
    for (const candidate of campaign.joinedCandidates) {
      const campaignId = candidate.campaignId ?? campaign.id;
      const results = candidate.results ?? [];
      const assessmentCount = Math.max(
        candidate.assessmentStack?.length ?? campaign.assessmentStack.length,
        results.length,
        1
      );
      const completedAssessments = new Set(
        results
          .filter((result) => result.completedAt || result.numericScore !== null)
          .map((result) => result.id || result.assessment)
      ).size;
      const totalAssessments = Math.max(assessmentCount, results.length, 1);
      const completion = Math.round((completedAssessments / totalAssessments) * 100);
      const progress =
        completedAssessments >= totalAssessments
          ? "completed"
          : completedAssessments > 0
            ? "in_progress"
            : "not_started";

      rows.push({
        id: candidate.id,
        candidateSessionId: candidate.id,
        name: candidate.name,
        email: candidate.email,
        status: candidate.status,
        campaignId,
        campaignName: candidate.campaignName ?? campaign.name,
        sessionName: candidate.sessionName ?? "Session",
        progress,
        completedAssessments,
        totalAssessments,
        completion,
      });
    }
  }

  return rows.sort((a, b) =>
    `${a.campaignName}${a.sessionName}${a.name}`.localeCompare(
      `${b.campaignName}${b.sessionName}${b.name}`
    )
  );
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function progressLabel(progress: CandidateRow["progress"]) {
  switch (progress) {
    case "completed":
      return "Completed";
    case "in_progress":
      return "In progress";
    case "not_started":
    default:
      return "Not started";
  }
}

export function HiringManagerCandidatesView() {
  const [campaigns, setCampaigns] = useState<HiringManagerCampaignDetail[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [sessionFilter, setSessionFilter] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all");

  const loadCandidates = async (force = false) => {
    setIsRefreshing(true);
    setError(null);
    try {
      const overview = await HiringManagerPortalClientService.getOverview({ force });
      setCampaigns(overview.campaignDetails);
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
  const campaignOptions = useMemo(
    () => uniqueOptions(candidates.map((candidate) => candidate.campaignName)),
    [candidates]
  );
  const sessionOptions = useMemo(
    () =>
      uniqueOptions(
        candidates
          .filter((candidate) => campaignFilter === "all" || candidate.campaignName === campaignFilter)
          .map((candidate) => candidate.sessionName)
      ),
    [campaignFilter, candidates]
  );
  const filteredCandidates = useMemo(
    () =>
      candidates.filter((candidate) => {
        const matchesCampaign = campaignFilter === "all" || candidate.campaignName === campaignFilter;
        const matchesSession = sessionFilter === "all" || candidate.sessionName === sessionFilter;
        const matchesProgress = progressFilter === "all" || candidate.progress === progressFilter;
        return matchesCampaign && matchesSession && matchesProgress;
      }),
    [campaignFilter, candidates, progressFilter, sessionFilter]
  );

  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Candidate view"
        title="Candidates"
        description="All joined candidates across active campaigns, with assessment progress and report access."
        icon={Users}
        stats={[
          { icon: UserCheck, label: `${candidates.length} candidate${candidates.length === 1 ? "" : "s"}` },
          { icon: Filter, label: `${filteredCandidates.length} shown` },
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

      <Card className="rounded-lg border border-white/10 bg-[#0b1220] shadow-none">
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <FilterSelect
            label="Campaign"
            allLabel="All campaigns"
            value={campaignFilter}
            onChange={(value) => {
              setCampaignFilter(value);
              setSessionFilter("all");
            }}
            options={campaignOptions}
          />
          <FilterSelect
            label="Session"
            allLabel="All sessions"
            value={sessionFilter}
            onChange={setSessionFilter}
            options={sessionOptions}
          />
          <FilterSelect
            label="Progress"
            allLabel="All progress"
            value={progressFilter}
            onChange={setProgressFilter}
            options={[
              { label: "Completed", value: "completed" },
              { label: "In progress", value: "in_progress" },
              { label: "Not started", value: "not_started" },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {filteredCandidates.length === 0 ? (
          <Card className="rounded-[1.25rem] border border-dashed border-border bg-card shadow-sm dark:border-white/10 dark:bg-[#080c16]/50 dark:shadow-none">
            <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
              {candidates.length === 0
                ? "No candidates have joined a campaign session yet."
                : "No candidate sessions match the current filters."}
            </CardContent>
          </Card>
        ) : (
          filteredCandidates.map((candidate) => (
            <Card
              key={`${candidate.campaignId}-${candidate.candidateSessionId}`}
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
                        {progressLabel(candidate.progress)}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 break-words text-sm leading-5 text-slate-400">
                    {candidate.email || "Email not available"}
                  </p>
                  <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                    {candidate.campaignName} · {candidate.sessionName}
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
                  <Link href={`/hiring-manager-dashboard/candidates/${candidate.candidateSessionId}/?campaignId=${candidate.campaignId}&candidateSessionId=${candidate.candidateSessionId}`}>
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

function FilterSelect({
  label,
  allLabel,
  value,
  onChange,
  options,
}: {
  label: string;
  allLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { label: string; value: string }>;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 rounded-md border-white/10 bg-white/[0.03] text-slate-100">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((option) => {
            const item = typeof option === "string" ? { label: option, value: option } : option;
            return (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
