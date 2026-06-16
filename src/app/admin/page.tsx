"use client";

import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  CreditCard,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { useAdminResource } from "@/lib/admin-resource-cache";
import {
  AdminAlert,
  AdminPageHeader,
  AdminQuickLinkRow,
  AdminStatTile,
} from "@/components/admin/admin-portal-ui";
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
    <div className="space-y-8">
      <AdminPageHeader
        title="Overview"
        description="Platform health at a glance — client contracts, seat usage, and items that need your attention."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatTile
          label="Active clients"
          value={overview.activeClients}
          detail="Registered contacts with active contracts"
          icon={Building2}
        />
        <AdminStatTile
          label="Awaiting signup"
          value={overview.awaitingClientSignups}
          detail="Contracted clients without a registered contact"
          icon={Clock3}
        />
        <AdminStatTile
          label="Client invites"
          value={overview.availableClientCodes}
          detail="Active admin-issued signup invites"
          icon={KeyRound}
        />
        <AdminStatTile
          label="Expiring soon"
          value={overview.contractsExpiringSoon}
          detail="Contracts expiring in the next 30 days"
          icon={AlertTriangle}
        />
      </div>

      {error ? <AdminAlert>{error}</AdminAlert> : null}

      <AdminQuickLinkRow
        links={[
          { href: "/admin/clients", label: "Clients", hint: "Manage organisations", icon: Building2 },
          { href: "/admin/billing", label: "Billing", hint: "Pricing and invoices", icon: CreditCard },
          { href: "/admin/upgrade-requests", label: "Entitlements", hint: "Seats and features", icon: ArrowUpRight },
        ]}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* HM Seat Capacity Card */}
        <DashboardInfoCard interactive={false} className="lg:col-span-4">
          <CardHeader className="border-b border-border/40 dark:border-white/5 pb-4">
            <CardTitle className="text-base font-bold text-foreground">HM Seat Capacity</CardTitle>
            <CardDescription className="mt-0.5 text-xs text-muted-foreground">
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
                    <span className="font-semibold text-foreground">{client.name}</span>
                    <span className="font-medium text-muted-foreground">
                      {client.seatsUsed} / {client.seatsAllowed} Seats
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            }) : (
              <p className="text-xs text-muted-foreground">No seat usage data available yet.</p>
            )}
          </CardContent>
        </DashboardInfoCard>

        {/* Recent Client Movement Card */}
        <DashboardInfoCard interactive={false} className="lg:col-span-3">
          <CardHeader className="border-b border-border/40 dark:border-white/5 pb-4">
            <CardTitle className="text-base font-bold text-foreground">Recent Client Movement</CardTitle>
            <CardDescription className="mt-0.5 text-xs text-muted-foreground">Latest client records returned by the platform API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {overview.recentActivity.length ? overview.recentActivity.map((activity, index) => (
              <div key={`${activity.id || "activity"}-${index}`}>
                <div className="flex items-center gap-4">
                  <History className="h-[18px] w-[18px] text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-bold leading-none text-foreground">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.detail}</p>
                  </div>
                </div>
                {index < overview.recentActivity.length - 1 && <Separator className="mt-4 border-white/5" />}
              </div>
            )) : (
              <p className="text-xs text-muted-foreground">No recent client activity yet.</p>
            )}
          </CardContent>
        </DashboardInfoCard>
      </div>

      {/* Operational Attention Card */}
      <DashboardInfoCard interactive={false}>
        <CardHeader className="border-b border-border/40 dark:border-white/5 pb-4">
          <CardTitle className="text-base font-bold text-foreground">Operational Attention</CardTitle>
          <CardDescription className="text-slate-400 text-xs mt-0.5">Real account states that need a CTRL admin decision.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="space-y-4">
            {overview.attentionRequired.length ? overview.attentionRequired.map((item, index) => (
              <div key={`${item.id || "attention"}-${index}`} className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="h-8 rounded-lg text-xs font-semibold">
                  <Link href="/admin/clients">
                    Review <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            )) : (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <FileCheck2 className="h-[18px] w-[18px] text-primary" />
                No real account issues need attention right now.
              </div>
            )}
          </div>
        </CardContent>
      </DashboardInfoCard>
    </div>
  );
}
