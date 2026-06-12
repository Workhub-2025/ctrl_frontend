"use client";
 
import Link from "next/link";
import { ArrowUpRight, Building2, KeyRound, Settings, ShieldCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminResource } from "@/lib/admin-resource-cache";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";

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
  const { data: overview, error: overviewError } = useAdminResource<Overview>(
    "admin:overview",
    "/api/admin/overview",
    {
      activeClients: 0,
      awaitingClientSignups: 0,
      availableClientCodes: 0,
      contractsExpiringSoon: 0,
    }
  );
  const { data: usersPayload, error: usersError } = useAdminResource<UsersPayload>(
    "admin:users",
    "/api/admin/users",
    {
      totals: {
        all: 0,
        ctrlAdmins: 0,
        clientContacts: 0,
        hiringManagers: 0,
        candidates: 0,
        disabled: 0,
      },
    }
  );
  const users = usersPayload.totals;
  const error = overviewError || usersError;

  return (
    <div className="space-y-6">
      <HiringManagerPageHeader
        eyebrow="Settings"
        title="Admin configuration"
        description="Real platform controls are split between client records, entitlements, and user access."
        icon={Settings}
        notice={
          error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          ) : null
        }
        action={
          <Badge variant="outline" className="w-fit border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-cyan-400 font-semibold rounded-lg shadow-sm pointer-events-none">
            Live-backed only
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard icon={Building2} label="Active contracts" value={overview.activeClients} />
        <StatusCard icon={KeyRound} label="Client invites" value={overview.availableClientCodes} />
        <StatusCard icon={Users} label="All users" value={users.all} />
        <StatusCard icon={ShieldCheck} label="CTRL admins" value={users.ctrlAdmins} />
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

      <Card className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 dark:border-white/5 dark:bg-[#0b1329]/25 shadow-sm backdrop-blur-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 shadow-sm">
            <Settings className="h-5 w-5" />
          </div>
          <CardTitle className="text-base font-bold text-white">Global settings</CardTitle>
          <CardDescription className="text-slate-400">
            No live global settings endpoint exists yet, so this page does not show fake toggles.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-slate-400">
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
    <Card className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 dark:border-white/5 dark:bg-[#0b1329]/25 shadow-sm backdrop-blur-md">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500" />
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-wide uppercase text-slate-400">{label}</p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-cyan-400">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-extrabold text-foreground">{value}</p>
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
    <Card className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/40 dark:border-white/5 dark:bg-[#0b1329]/25 shadow-sm backdrop-blur-md">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-cyan-500 to-indigo-500" />
      <CardHeader>
        <CardTitle className="text-base font-bold text-white">{title}</CardTitle>
        <CardDescription className="text-slate-400">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" className="gap-2 border-white/10 hover:bg-white/10 text-slate-200">
          <Link href={href}>
            {action}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

