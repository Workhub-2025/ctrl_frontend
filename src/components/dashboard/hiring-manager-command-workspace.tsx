"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Users,
  CheckCircle2,
  Clock,
  Plus,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  portalBadgeClass,
  portalIconWrapClass,
  portalIconWrapLgClass,
  portalPanelClass,
  portalPanelElevatedClass,
  portalPrimaryButtonClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

type CommandWorkspaceProps = {
  activeCampaignCount: number;
  totalCandidateCount: number;
  pendingReviewCount: number;
  avgIntegrityScore?: number;
  title?: string;
  description?: string;
  children?: React.ReactNode;
};

export function HiringManagerCommandWorkspace({
  activeCampaignCount,
  totalCandidateCount,
  pendingReviewCount,
  avgIntegrityScore = 98,
  title = "Hiring Command Workspace",
  description = "Manage structured campaigns, active assessment sessions, and candidate decision reviews in one unified workspace.",
  children,
}: CommandWorkspaceProps) {
  const stats = useMemo(
    () => [
      {
        label: "Active Campaigns",
        value: activeCampaignCount,
        href: "/hiring-manager-dashboard/campaigns",
        icon: FolderKanban,
      },
      {
        label: "Total Candidates",
        value: totalCandidateCount,
        href: "/hiring-manager-dashboard/candidates",
        icon: Users,
      },
      {
        label: "Pending Reviews",
        value: pendingReviewCount,
        href: "/hiring-manager-dashboard/candidates?status=completed",
        icon: Clock,
        highlight: pendingReviewCount > 0,
      },
      {
        label: "Avg. Integrity",
        value: `${Math.round(avgIntegrityScore)}%`,
        icon: ShieldCheck,
      },
    ],
    [activeCampaignCount, totalCandidateCount, pendingReviewCount, avgIntegrityScore]
  );

  return (
    <div className="space-y-6">
      <Card className={cn(portalPanelElevatedClass, "relative overflow-hidden border-border/60")}>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className={cn(portalBadgeClass, "px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase border-primary/30 text-primary")}>
                  Active Workspace
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl text-balance">
                {title}
              </h1>
              <p className="text-sm leading-6 text-muted-foreground text-pretty">
                {description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Button
                type="button"
                asChild
                className={cn(portalPrimaryButtonClass, "h-10 px-4 text-xs font-semibold shadow-sm")}
              >
                <Link href="/hiring-manager-dashboard/campaigns/create">
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  New Campaign
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className={cn(
                    portalPanelClass,
                    "group relative flex items-center justify-between p-4 transition-all hover:border-primary/40",
                    stat.highlight && "border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10"
                  )}
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                      {stat.value}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={cn(portalIconWrapClass, "h-9 w-9 group-hover:border-primary/40 group-hover:text-primary")}>
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    {stat.href ? (
                      <Link
                        href={stat.href}
                        className="sr-only focus:not-sr-only focus:absolute focus:inset-0 focus:z-10"
                        title={`View ${stat.label}`}
                      >
                        <span className="sr-only">View {stat.label}</span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {children}
    </div>
  );
}
