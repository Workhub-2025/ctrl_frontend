"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, KeyRound, Settings, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Overview = {
  activeClients: number;
  awaitingClientSignups: number;
  availableClientCodes: number;
  contractsExpiringSoon: number;
};

type UsersPayload = {
  totals: {
    all: number;
    ctrlAdmins: number;
    clientContacts: number;
    hiringManagers: number;
    candidates: number;
    disabled: number;
  };
};

export default function AdminSettingsPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<UsersPayload["totals"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/admin/overview", { cache: "no-store" }).then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Overview could not be loaded");
        return body.data as Overview;
      }),
      fetch("/api/admin/users", { cache: "no-store" }).then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "Users could not be loaded");
        return body.data as UsersPayload;
      }),
    ])
      .then(([overviewData, usersData]) => {
        if (!cancelled) {
          setOverview(overviewData);
          setUsers(usersData.totals);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Settings could not be loaded");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-500/80">
            Settings
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Admin configuration</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Real platform controls are split between client records, entitlements, and user access.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-cyan-600">
          Live-backed only
        </Badge>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard icon={Building2} label="Active contracts" value={overview?.activeClients ?? "..."} />
        <StatusCard icon={KeyRound} label="Client invites" value={overview?.availableClientCodes ?? "..."} />
        <StatusCard icon={Users} label="All users" value={users?.all ?? "..."} />
        <StatusCard icon={ShieldCheck} label="CTRL admins" value={users?.ctrlAdmins ?? "..."} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminSurface
          title="Client setup"
          description="Create clients, issue client signup invites, and review contracts."
          href="/admin/clients"
          action="Open clients"
        />
        <AdminSurface
          title="Upgrades and entitlements"
          description="Change HM seat capacity and feature access for active clients."
          href="/admin/upgrade-requests"
          action="Open upgrades"
        />
        <AdminSurface
          title="Users"
          description="Review CTRL admins, client contacts, hiring managers, candidates, and disabled records."
          href="/admin/users"
          action="Open users"
        />
      </div>

      <Card>
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-600">
            <Settings className="h-5 w-5" />
          </div>
          <CardTitle>Global settings</CardTitle>
          <CardDescription>
            No live global settings endpoint exists yet, so this page does not show fake toggles.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The settings shown above are routed to existing live-backed admin surfaces. Add global controls here once the backend has a source of truth for them.
        </CardContent>
      </Card>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string | number;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-cyan-600" />
        </div>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function AdminSurface({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="gap-2">
          <Link href={href}>
            {action}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
