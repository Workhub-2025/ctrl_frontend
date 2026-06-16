"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Ticket, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateTicketDialog } from "@/components/dashboard/create-ticket-dialog";
import { HiringManagerPageHeader } from "@/components/dashboard/hiring-manager-page-header";
import { formatDate } from "@/components/dashboard/client/client-portal-utils";
import {
  PortalEmptyState,
  PortalPanel,
  PortalSectionHeader,
  PortalStatTile,
} from "@/components/dashboard/portal/portal-ui";
import { useClientPortal } from "@/hooks/use-client-portal";
import { cn } from "@/lib/utils";

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-xs leading-relaxed text-red-600 dark:text-red-200">
      {message}
    </p>
  );
}

function prettifyFeatureKey(key: string) {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ClientUpgradeContent() {
  const { summary, contract, contractLoading, error, loadContract, loadOverview } =
    useClientPortal();
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);

  useEffect(() => {
    void loadContract();
  }, [loadContract]);

  const features = useMemo(() => {
    const raw = summary?.client?.features;
    if (!raw || typeof raw !== "object") return [];
    return Object.entries(raw).map(([key, value]) => ({
      key,
      label: prettifyFeatureKey(key),
      value: typeof value === "boolean" ? (value ? "Enabled" : "Disabled") : String(value),
      enabled: value === true,
    }));
  }, [summary?.client?.features]);

  const activeContract = contract ?? summary?.activeContract ?? null;

  return (
    <div className="relative mx-auto max-w-7xl space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <HiringManagerPageHeader
        eyebrow="Upgrade requests"
        title="Entitlements & upgrades"
        description="Review your contract limits and request additional seats or platform features."
        icon={TrendingUp}
        notice={error ? <ErrorBanner message={error} /> : null}
        action={
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-border text-foreground transition-colors hover:!bg-muted hover:!text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/10 dark:hover:!bg-white/[0.08] dark:hover:!text-white"
            onClick={() => {
              void loadContract();
              void loadOverview(true);
            }}
            disabled={contractLoading}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", contractLoading && "motion-safe:animate-spin text-primary")}
              aria-hidden="true"
            />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <PortalStatTile
          label="Contract seats"
          value={activeContract?.seatCount ?? summary?.seats.limit ?? "…"}
          detail="Seats included in your active contract"
          icon={TrendingUp}
        />
        <PortalStatTile
          label="Contract start"
          value={formatDate(activeContract?.startDate)}
          detail="Active contract start date"
          icon={TrendingUp}
          tone="success"
        />
        <PortalStatTile
          label="Contract end"
          value={formatDate(activeContract?.endDate)}
          detail={activeContract?.status ? `Status: ${activeContract.status}` : "Active contract end date"}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PortalPanel accent="primary">
          <div className="space-y-6 p-6">
            <PortalSectionHeader
              eyebrow="Entitlements"
              title="Client features"
              description="Features enabled on your client account."
            />

            {contractLoading && !features.length && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 motion-safe:animate-spin text-primary" aria-hidden="true" />
                Loading entitlements…
              </p>
            )}

            {!contractLoading && features.length === 0 && (
              <PortalEmptyState
                icon={TrendingUp}
                title="No feature entitlements listed"
                description="Feature details will appear here when configured on your client account."
              />
            )}

            {features.length > 0 && (
              <ul className="grid gap-3 sm:grid-cols-2">
                {features.map((feature) => (
                  <li
                    key={feature.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/30 px-4 py-3 dark:border-white/5 dark:bg-[#0b1220]/25"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{feature.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{feature.value}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "shrink-0 rounded-full text-[10px] font-semibold",
                        feature.enabled
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                          : "border-border bg-muted/40 text-muted-foreground"
                      )}
                    >
                      {feature.enabled ? "Enabled" : feature.value}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}

            {activeContract?.notes ? (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground dark:border-white/5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contract notes
                </p>
                <p className="mt-2 leading-relaxed">{activeContract.notes}</p>
              </div>
            ) : null}
          </div>
        </PortalPanel>

        <PortalPanel accent="campaign" className="h-fit">
          <div className="flex flex-col gap-4 p-6">
            <PortalSectionHeader
              eyebrow="Request upgrade"
              title="Need more capacity?"
              description="Submit an upgrade request and our team will follow up on seats or feature changes."
            />
            <CreateTicketDialog
              defaultSubject="Seat or feature upgrade request"
              onSuccess={() => setTicketRefreshKey((k) => k + 1)}
            >
              <Button className="h-10 w-full gap-2 rounded-xl font-semibold">
                <Ticket className="h-4 w-4" aria-hidden="true" />
                Request upgrade
              </Button>
            </CreateTicketDialog>
            {ticketRefreshKey > 0 ? (
              <p className="text-center text-xs text-muted-foreground">
                Upgrade request submitted — check Messages for ticket updates.
              </p>
            ) : null}
          </div>
        </PortalPanel>
      </div>
    </div>
  );
}
