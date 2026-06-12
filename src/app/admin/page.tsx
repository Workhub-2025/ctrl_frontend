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
} from "lucide-react";
import Link from "next/link";
import { useAdminResource } from "@/lib/admin-resource-cache";

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-responsive-3xl font-bold font-headline title-adaptive">
            Overview
          </h3>
          <p className="text-adaptive-secondary text-responsive-base leading-relaxed">
            High-level metrics and operations for the CTRL platform.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.activeClients}</div>
            <p className="text-xs text-muted-foreground">Registered client contacts with active contracts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Signup</CardTitle>
            <Clock3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {overview.awaitingClientSignups}
            </div>
            <p className="text-xs text-muted-foreground">Contracted clients without a registered contact</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Invites</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.availableClientCodes}</div>
            <p className="text-xs text-muted-foreground">Active admin-issued signup invites</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.contractsExpiringSoon}</div>
            <p className="text-xs text-muted-foreground">Contracts in next 30 days</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Card className="border-red-500/30">
          <CardContent className="py-4 text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>HM seat capacity</CardTitle>
            <CardDescription>
              Active hiring-manager occupants versus contracted reusable seats.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {seatUsage.length ? seatUsage.map((client, index) => {
              const percent = client.seatsAllowed
                ? Math.min(100, Math.round((client.seatsUsed / client.seatsAllowed) * 100))
                : 0;
              return (
                <div key={`${client.id || "seat-client"}-${index}`} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{client.name}</span>
                    <span className="text-muted-foreground">
                      {client.seatsUsed}/{client.seatsAllowed} Seats
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={percent >= 100 ? "h-full bg-orange-500" : "h-full bg-cyan-600"}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            }) : (
              <p className="text-sm text-muted-foreground">No seat usage data available yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent client movement</CardTitle>
            <CardDescription>Latest client records returned by the platform API.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {overview.recentActivity.length ? overview.recentActivity.map((activity, index) => (
              <div key={`${activity.id || "activity"}-${index}`}>
                <div className="flex items-center gap-4">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.detail}</p>
                  </div>
                </div>
                {index < overview.recentActivity.length - 1 && <Separator className="mt-4" />}
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No recent client activity yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Operational attention</CardTitle>
          <CardDescription>Real account states that need a CTRL admin decision.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {overview.attentionRequired.length ? overview.attentionRequired.map((item, index) => (
            <div key={`${item.id || "attention"}-${index}`} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/clients">
                  Review <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
            )) : (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <FileCheck2 className="h-4 w-4 text-emerald-600" />
                No real account issues need attention right now.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
