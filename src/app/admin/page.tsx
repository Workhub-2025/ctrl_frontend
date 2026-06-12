"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  AlertTriangle,
  History,
  ArrowRight,
  Clock3,
  FileCheck2,
  KeyRound,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { useAdminResource } from "@/lib/admin-resource-cache";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { DashboardInfoCard } from "@/components/dashboard/dashboard-info-card";
import { cn } from "@/lib/utils";

type AdminOverviewData = {
  activeClients: number;
  awaitingClientSignups: number;
  pendingCampaignApprovals: number;
  availableClientCodes: number;
  contractsExpiringSoon: number;
  seatUsage: Array<{
    id: string;
    name: string;
    seatsUsed: number;
    seatsAllowed: number;
  }>;
  recentActivity: Array<{
    id: string;
    title: string;
    detail: string;
  }>;
  attentionRequired: Array<{
    id: string;
    title: string;
    detail: string;
  }>;
};

export default function AdminOverview() {
  const { data: overview, error } = useAdminResource<AdminOverviewData>(
    "admin:overview",
    "/api/admin/overview",
    {
      activeClients: 0,
      awaitingClientSignups: 0,
      pendingCampaignApprovals: 0,
      availableClientCodes: 0,
      contractsExpiringSoon: 0,
      seatUsage: [],
      recentActivity: [],
      attentionRequired: [],
    }
  );

  const seatUsage = useMemo(() => overview.seatUsage ?? [], [overview]);

  return (
    <div className="max-w-7xl space-y-6">
      <HiringManagerPageHeader
        eyebrow="Platform Operations"
        title="Overview"
        description="High-level metrics, seat allocations, audit logs, and account diagnostics for the CTRL platform."
        icon={LayoutDashboard}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Active Clients */}
        <DashboardInfoCard accent="primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-6">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active Clients</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
              <Building2 className="h-[18px] w-[18px]" />
            </div>
          </CardHeader>
          <CardContent className="pl-6">
            <div className="text-3xl font-black text-foreground mt-1">{overview.activeClients}</div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Registered client contacts with active contracts</p>
          </CardContent>
        </DashboardInfoCard>

        {/* Metric 2: Awaiting Signup */}
        <DashboardInfoCard accent="session">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-6">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Awaiting Signup</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-500">
              <Clock3 className="h-[18px] w-[18px]" />
            </div>
          </CardHeader>
          <CardContent className="pl-6">
            <div className="text-3xl font-black text-foreground mt-1">
              {overview.awaitingClientSignups}
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Contracted clients without a registered contact</p>
          </CardContent>
        </DashboardInfoCard>

        {/* Metric 3: Client Invites */}
        <DashboardInfoCard accent="campaign">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-6">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client Invites</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-500">
              <KeyRound className="h-[18px] w-[18px]" />
            </div>
          </CardHeader>
          <CardContent className="pl-6">
            <div className="text-3xl font-black text-foreground mt-1">{overview.availableClientCodes}</div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Active admin-issued signup invites</p>
          </CardContent>
        </DashboardInfoCard>

        {/* Metric 4: Expiring Soon */}
        <DashboardInfoCard accent="warning">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-6">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expiring Soon</CardTitle>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-500">
              <AlertTriangle className="h-[18px] w-[18px]" />
            </div>
          </CardHeader>
          <CardContent className="pl-6">
            <div className="text-3xl font-black text-foreground mt-1">{overview.contractsExpiringSoon}</div>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">Contracts expiring in the next 30 days</p>
          </CardContent>
        </DashboardInfoCard>
      </div>

      {error && (
        <Card className="border-red-500/30 bg-red-500/5 text-red-400 rounded-xl">
          <CardContent className="py-4 text-sm font-semibold">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* HM Seat Capacity Card */}
        <DashboardInfoCard accent="primary" interactive={false} className="lg:col-span-4">
          <CardHeader className="border-b border-border/40 dark:border-white/5 pb-4">
            <CardTitle className="text-base font-bold text-foreground">HM Seat Capacity</CardTitle>
            <CardDescription className="text-slate-400 text-xs mt-0.5">
              Active hiring-manager occupants versus contracted reusable seats.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {seatUsage.length ? seatUsage.map((client, index) => {
              const percent = client.seatsAllowed
                ? Math.min(100, Math.round((client.seatsUsed / client.seatsAllowed) * 100))
                : 0;
              return (
                <div key={`${client.id || "seat-client"}-${index}`} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">{client.name}</span>
                    <span className="text-slate-400 font-semibold">
                      {client.seatsUsed} / {client.seatsAllowed} Seats
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-300", percent >= 100 ? "bg-amber-500" : "bg-primary")}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            }) : (
              <p className="text-xs text-slate-400">No seat usage data available yet.</p>
            )}
          </CardContent>
        </DashboardInfoCard>

        {/* Recent Client Movement Card */}
        <DashboardInfoCard accent="campaign" interactive={false} className="lg:col-span-3">
          <CardHeader className="border-b border-border/40 dark:border-white/5 pb-4">
            <CardTitle className="text-base font-bold text-foreground">Recent Client Movement</CardTitle>
            <CardDescription className="text-slate-400 text-xs mt-0.5">Latest client records returned by the platform API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {overview.recentActivity.length ? overview.recentActivity.map((activity, index) => (
              <div key={`${activity.id || "activity"}-${index}`}>
                <div className="flex items-center gap-4">
                  <History className="h-[18px] w-[18px] text-slate-400" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-bold leading-none text-foreground">{activity.title}</p>
                    <p className="text-xs text-slate-400">{activity.detail}</p>
                  </div>
                </div>
                {index < overview.recentActivity.length - 1 && <Separator className="mt-4 border-white/5" />}
              </div>
            )) : (
              <p className="text-xs text-slate-400">No recent client activity yet.</p>
            )}
          </CardContent>
        </DashboardInfoCard>
      </div>

      {/* Operational Attention Card */}
      <DashboardInfoCard accent="warning" interactive={false}>
        <CardHeader className="border-b border-border/40 dark:border-white/5 pb-4">
          <CardTitle className="text-base font-bold text-foreground">Operational Attention</CardTitle>
          <CardDescription className="text-slate-400 text-xs mt-0.5">Real account states that need a CTRL admin decision.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="space-y-4">
            {overview.attentionRequired.length ? overview.attentionRequired.map((item, index) => (
              <div key={`${item.id || "attention"}-${index}`} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.detail}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="h-8 rounded-lg border-white/15 bg-white/[0.02] text-xs font-semibold text-slate-300 hover:bg-white/[0.06] hover:text-white">
                  <Link href="/admin/clients">
                    Review <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )) : (
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <FileCheck2 className="h-[18px] w-[18px] text-emerald-400" />
                No real account issues need attention right now.
              </div>
            )}
          </div>
        </CardContent>
      </DashboardInfoCard>
    </div>
  );
}
