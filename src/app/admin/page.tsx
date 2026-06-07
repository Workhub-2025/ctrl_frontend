"use client";

import { useEffect, useMemo, useState } from "react";
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
  TrendingUp,
  CreditCard,
  AlertTriangle,
  History,
  Eye,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

type AdminOverviewData = {
  activeClients: number;
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
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/overview", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Admin overview could not be loaded");
        return body.data as AdminOverviewData;
      })
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Admin overview could not be loaded");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const seatUsage = useMemo(() => overview?.seatUsage ?? [], [overview]);

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

      {/* Top Row: Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.activeClients ?? "..."}</div>
            <p className="text-xs text-muted-foreground">Clients with active contracts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaign Approvals</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {overview?.pendingCampaignApprovals ?? "..."}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting client review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Client Codes</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.availableClientCodes ?? "..."}</div>
            <p className="text-xs text-muted-foreground">Available admin-issued invites</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview?.contractsExpiringSoon ?? "..."}</div>
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
        {/* Middle Row: Seat Usage */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Seat Usage (Top Clients)</CardTitle>
            <CardDescription>
              Hiring manager seats utilized versus allocated.
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

        {/* Middle Row: Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Admin Activity</CardTitle>
            <CardDescription>System actions across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(overview?.recentActivity ?? []).length ? overview?.recentActivity.map((activity, index) => (
              <div key={`${activity.id || "activity"}-${index}`}>
                <div className="flex items-center gap-4">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.detail}</p>
                  </div>
                </div>
                {index < (overview?.recentActivity.length ?? 0) - 1 && <Separator className="mt-4" />}
              </div>
            )) : (
              <p className="text-sm text-muted-foreground">No recent client activity yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Support / Account Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Attention Required</CardTitle>
          <CardDescription>Accounts flagged for review or support issues.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(overview?.attentionRequired ?? []).length ? overview?.attentionRequired.map((item, index) => (
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
              <p className="text-sm text-muted-foreground">No accounts need attention right now.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
