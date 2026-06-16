"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PortalAlert,
  PortalLinkCard,
  PortalPageHeader,
  PortalPanel,
  PortalStatTile,
} from "@/components/dashboard/portal/portal-ui";
import { portalIconWrapLgClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

export function ClientErrorBanner({
  message,
  children,
  tone = "error",
}: {
  message?: string;
  children?: React.ReactNode;
  tone?: "error" | "info";
}) {
  return <PortalAlert tone={tone}>{message ?? children}</PortalAlert>;
}
export const ClientPageHeader = PortalPageHeader;
export const ClientStatTile = PortalStatTile;

export function ClientRefreshButton({
  onClick,
  loading,
  label = "Refresh",
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 rounded-lg"
      onClick={onClick}
      disabled={loading}
    >
      <RefreshCw
        className={cn("mr-2 h-4 w-4", loading && "motion-safe:animate-spin text-primary")}
        aria-hidden="true"
      />
      {label}
    </Button>
  );
}

export function ClientQuickLink({
  href,
  icon: Icon,
  title,
  description,
  badge,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string | number;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <PortalPanel className="h-full transition-colors hover:border-primary/20">
        <div className="flex items-start gap-3">
          <span className={portalIconWrapLgClass}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-foreground">{title}</h3>
              {badge !== undefined && Number(badge) > 0 ? (
                <span className="rounded-md border border-border/60 bg-muted/35 px-2 py-0.5 text-xs font-medium">
                  {badge}
                </span>
              ) : null}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>
      </PortalPanel>
    </Link>
  );
}
