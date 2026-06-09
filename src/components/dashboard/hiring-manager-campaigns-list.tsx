"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  RefreshCw,
  Keyboard,
  ClipboardList,
  BrainCircuit,
  PhoneCall,
  FileQuestion,
  Target,
  Users,
  CalendarDays,
  Layers3,
} from "lucide-react";
import { getStatusTone } from "@/components/dashboard/hiring-manager-dashboard-data";
import {
  HiringManagerPortalClientService,
  type HiringManagerCampaignListItem,
} from "@/services/hiring-manager-portal-client.service";

function formatLastRefresh(value: number | null) {
  if (!value) return "Not refreshed yet";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(value));
}

export function HiringManagerCampaignsList() {
  const [campaigns, setCampaigns] = useState<HiringManagerCampaignListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<number | null>(
    HiringManagerPortalClientService.getCampaignsLastRefresh()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadCampaigns = async (force = false) => {
    setIsRefreshing(true);
    setError(null);
    try {
      const data = await HiringManagerPortalClientService.getCampaigns({ force });
      setCampaigns(data);
      setLastRefreshAt(HiringManagerPortalClientService.getCampaignsLastRefresh());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Campaigns could not be loaded."
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadCampaigns(false);
  }, []);

  const refreshLabel = useMemo(
    () => `Last refresh: ${formatLastRefresh(lastRefreshAt)}`,
    [lastRefreshAt]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">{refreshLabel}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => loadCampaigns(true)}
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
        {campaigns.length === 0 ? (
          <Card className="rounded-[1.25rem] border border-dashed border-border bg-card shadow-sm dark:border-white/10 dark:bg-[#080c16]/50 dark:shadow-none">
            <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
              No campaigns have been created yet. Create a campaign to attach
              assessments and generate candidate Access Codes.
            </CardContent>
          </Card>
        ) : (
          campaigns.map((campaign) => (
            <Card
              key={campaign.id}
              className="group rounded-[1.25rem] border border-white/10 bg-[#080c16]/50 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:border-primary/40 dark:bg-[#0b1329]/45 hover:shadow-[0_8px_30px_rgba(99,102,241,0.08)] transition-all duration-300 hover:-translate-y-0.5"
            >
              <CardContent className="space-y-4 p-5">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="min-w-0 space-y-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={getStatusTone(campaign.status)}>
                        {campaign.status}
                      </Badge>
                      <Badge className="rounded-md border-white/5 bg-white/[0.03] text-xs text-slate-300 hover:bg-white/[0.03]">
                        {campaign.deliveryMode}
                      </Badge>
                      {campaign.approvalStatus && (
                        <Badge
                          className={[
                            "rounded-md border-none text-xs font-semibold px-2 py-0.5",
                            campaign.approvalStatus === "Pending approval"
                              ? "bg-orange-500/10 text-orange-400"
                              : campaign.approvalStatus === "Rejected"
                                ? "bg-red-500/10 text-red-400"
                                : "bg-emerald-500/10 text-emerald-400"
                          ].join(" ")}
                        >
                          {campaign.approvalStatus}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="min-w-0 space-y-2">
                      <h2 className="break-words text-lg font-bold leading-snug text-foreground">
                        {campaign.name}
                      </h2>
                    </div>
                  </div>

                  {/* Next Milestone Box */}
                  <div className="flex items-start gap-2.5 rounded-xl border border-primary/10 bg-[#08101d]/60 p-3.5 text-xs text-foreground shadow-sm dark:border-white/5 dark:bg-white/[0.01]">
                    <Target className="mt-0.5 h-4.5 w-4.5 shrink-0 text-primary animate-pulse" />
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Next Milestone</p>
                      <p className="mt-1 font-medium leading-relaxed text-foreground">{campaign.nextMilestone}</p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-[1fr_0.95fr] pt-2">
                  {/* Assessment Stack Card */}
                  <div className="rounded-xl border border-border bg-background/30 p-3.5 shadow-sm dark:border-white/5 dark:bg-white/[0.01]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Assessment stack
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {campaign.assessmentStack.map((item) => {
                        const Icon = getAssessmentIcon(item);
                        return (
                          <span
                            key={item}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground dark:border-white/10 dark:bg-white/[0.02]"
                          >
                            <Icon className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                            {item}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Session Readiness Card */}
                  <div className="rounded-xl border border-border bg-background/30 p-3.5 shadow-sm dark:border-white/5 dark:bg-white/[0.01]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Session readiness
                    </p>
                    <div className="mt-3 rounded-lg border border-border bg-card p-3 dark:border-white/10 dark:bg-[#04070d]/60">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-semibold leading-none text-foreground">
                            {campaign.sessions} Access Code{campaign.sessions === 1 ? "" : "s"}
                          </p>
                          <p className="mt-1.5 break-words text-[11px] leading-tight text-muted-foreground">
                            {campaign.nextMilestone}
                          </p>
                        </div>
                        <Badge className="shrink-0 rounded-md border-none bg-emerald-500/10 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10">
                          Active
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    variant="outline"
                    className="h-9 rounded-md border-white/10 bg-white/[0.02] px-3.5 text-xs font-medium text-slate-100 hover:bg-white/[0.05] group-hover:border-primary/30"
                    asChild
                  >
                    <Link href={`/hiring-manager-dashboard/campaigns/${campaign.id}/`}>
                      Open campaign view
                      <ArrowRight className="ml-2 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function getAssessmentIcon(name: string) {
  const lowercase = name.toLowerCase();
  if (lowercase.includes("typing")) {
    return Keyboard;
  }
  if (lowercase.includes("prioriti") || lowercase.includes("order")) {
    return ClipboardList;
  }
  if (lowercase.includes("judgement") || lowercase.includes("sjt") || lowercase.includes("behavior")) {
    return BrainCircuit;
  }
  if (lowercase.includes("call") || lowercase.includes("audio") || lowercase.includes("simulat")) {
    return PhoneCall;
  }
  return FileQuestion;
}
