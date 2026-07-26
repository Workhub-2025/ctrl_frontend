"use client";

import { useMemo } from "react";
import { History, Users } from "lucide-react";
import { useAdminResource } from "@/lib/admin-resource-cache";
import {
  AdminAlert,
  AdminEmptyState,
  AdminPageHeader,
  AdminPanel,
  AdminSectionHeader,
} from "@/components/admin/admin-portal-ui";
import { PortalDecisionLedger } from "@/components/dashboard/portal/portal-ui";
import { portalProgressBarClass } from "@/components/dashboard/portal/portal-design-tokens";

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

      {error ? <AdminAlert>{error}</AdminAlert> : null}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <AdminPanel padding={false} className="overflow-hidden lg:col-span-4">
          <div className="border-b border-border/40 px-5 py-4 dark:border-white/5">
            <AdminSectionHeader
              title="Hiring-manager seat capacity"
              description="Active hiring-manager occupants versus contracted reusable seats."
            />
          </div>
          <div className="space-y-4 px-5 py-5">
            {seatUsage.length ? (
              seatUsage.map((client, index) => {
                const percent = client.seatsAllowed
                  ? Math.min(100, Math.round((client.seatsUsed / client.seatsAllowed) * 100))
                  : 0;
                return (
                  <div key={`${client.id || "seat-client"}-${index}`} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{client.name}</span>
                      <span className="font-medium text-muted-foreground">
                        {client.seatsUsed} / {client.seatsAllowed} seats
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={portalProgressBarClass}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <AdminEmptyState
                icon={Users}
                title="No seat usage yet"
                description="Seat occupancy appears here once clients activate hiring managers."
              />
            )}
          </div>
        </AdminPanel>

        <AdminPanel padding={false} className="overflow-hidden lg:col-span-3">
          <div className="border-b border-border/40 px-5 py-4 dark:border-white/5">
            <AdminSectionHeader
              title="Recent client activity"
              description="Latest client records returned by the platform API."
            />
          </div>
          <div className="space-y-4 px-5 py-5">
            {overview.recentActivity.length ? (
              overview.recentActivity.map((activity, index) => (
                <div key={`${activity.id || "activity"}-${index}`}>
                  <div className="flex items-center gap-4">
                    <History className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-semibold leading-none text-foreground">
                        {activity.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.detail}</p>
                    </div>
                  </div>
                  {index < overview.recentActivity.length - 1 ? (
                    <div className="mt-4 border-b border-border/40" />
                  ) : null}
                </div>
              ))
            ) : (
              <AdminEmptyState
                icon={History}
                title="No recent activity"
                description="Client movement will appear here as organisations use the platform."
              />
            )}
          </div>
        </AdminPanel>
      </div>

      <PortalDecisionLedger
        title="Operational decisions"
        description="Account states that require a CTRL administrator response."
        items={overview.attentionRequired.map((item, index) => ({
          id: `${item.id || "attention"}-${index}`,
          title: item.title,
          detail: item.detail,
          href: "/admin/organizations",
        }))}
        emptyTitle="No account issues need attention"
        emptyDescription="Contracts, access and client records are currently up to date."
      />
    </div>
  );
}
