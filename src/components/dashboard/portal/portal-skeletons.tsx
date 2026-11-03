import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  portalCardClass,
  portalPanelClass,
  portalStatTileClass,
} from "@/components/dashboard/portal/portal-design-tokens";

/*
 * Loading placeholders that mirror the real portal cards box for box, so the
 * page keeps its shape while data arrives instead of flashing an empty state.
 * Each skeleton copies the container classes of the card it stands in for.
 */

/** One shimmering placeholder shape. */
export function Bone({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block rounded-md bg-muted/60 motion-safe:animate-pulse",
        className
      )}
    />
  );
}

/** Announces loading once to assistive tech and hides the placeholders. */
export function PortalSkeletonRegion({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

function repeat(count: number, render: (index: number) => ReactNode) {
  return Array.from({ length: count }, (_, index) => render(index));
}

/** Hiring-manager campaigns list card. */
export function HmCampaignCardSkeleton() {
  return (
    <div className={cn(portalPanelClass, "space-y-4 p-4 sm:p-5")}>
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Bone className="h-5 w-14" />
          <Bone className="h-5 w-16" />
          <Bone className="h-5 w-20" />
        </div>
        <Bone className="h-7 w-36 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Bone className="h-6 w-56 max-w-full" />
        <Bone className="h-4 w-72 max-w-full" />
      </div>
      <div className="pt-1.5">
        <Bone className="h-3 w-20" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {repeat(3, (index) => (
            <Bone key={index} className="h-5 w-24" />
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Bone className="h-9 w-32" />
        <Bone className="h-9 w-28" />
      </div>
    </div>
  );
}

/** Client campaign register card (details left, decision box right). */
export function ClientCampaignCardSkeleton() {
  return (
    <div className={cn(portalCardClass, "p-5")}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Bone className="h-6 w-28" />
            <Bone className="h-6 w-16 rounded-lg" />
            <Bone className="h-6 w-24 rounded-lg" />
          </div>
          <div className="space-y-2">
            <Bone className="h-6 w-56 max-w-full" />
            <Bone className="h-4 w-72 max-w-full" />
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-4">
            <Bone className="h-3 w-32" />
            <div className="mt-3 flex flex-wrap gap-2">
              {repeat(3, (index) => (
                <Bone key={index} className="h-8 w-32" />
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between gap-4 rounded-md border border-border bg-muted/40 p-4">
          <div className="space-y-2">
            <Bone className="h-4 w-40" />
            <Bone className="h-3 w-full" />
            <Bone className="h-3 w-3/4" />
          </div>
          <Bone className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}

/** Client Team seat card (occupied layout). */
export function SeatCardSkeleton() {
  return (
    <div
      className={cn(
        portalCardClass,
        "flex min-h-[200px] flex-col justify-between space-y-4 p-5"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Bone className="h-10 w-10 shrink-0" />
          <div className="space-y-1.5">
            <Bone className="h-4 w-28" />
            <Bone className="h-3 w-36" />
          </div>
        </div>
        <Bone className="h-5 w-14 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
        <Bone className="h-12" />
        <Bone className="h-12" />
      </div>
      <Bone className="h-8 w-full" />
    </div>
  );
}

/** Client shared-candidate card. */
export function ClientCandidateCardSkeleton() {
  return (
    <div className={cn(portalCardClass, "p-5")}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Bone className="h-6 w-24" />
            <Bone className="h-6 w-32 rounded-lg" />
          </div>
          <Bone className="h-5 w-44" />
          <Bone className="h-4 w-56" />
          <Bone className="h-3 w-64 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-10 w-28" />
          <Bone className="h-10 w-28" />
        </div>
      </div>
    </div>
  );
}

/** Hiring-manager candidate card (identity row plus decision journey). */
export function HmCandidateCardSkeleton() {
  return (
    <div className={cn(portalPanelClass, "space-y-5 p-4 sm:p-5")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Bone className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Bone className="h-5 w-40" />
              <Bone className="h-4 w-20" />
            </div>
            <Bone className="h-3 w-48" />
            <Bone className="h-2.5 w-36" />
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="space-y-1.5 border-r border-border/60 pr-4">
            <Bone className="ml-auto h-2.5 w-16" />
            <Bone className="h-4 w-20" />
          </div>
          <Bone className="h-9 w-32 rounded-xl" />
        </div>
      </div>
      <div className="grid gap-2 border-t border-border pt-4 md:grid-cols-3">
        {repeat(3, (index) => (
          <Bone key={index} className="h-14" />
        ))}
      </div>
    </div>
  );
}

/** Rows inside a decision ledger / campaign focus panel. */
export function LedgerRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-border" aria-hidden="true">
      {repeat(rows, (index) => (
        <li key={index} className="flex min-h-[4.5rem] items-center gap-4 px-5 py-4">
          <Bone className="h-8 w-1 shrink-0 rounded-none" />
          <span className="min-w-0 flex-1 space-y-1.5">
            <Bone className="h-4 w-48 max-w-full" />
            <Bone className="h-4 w-72 max-w-full" />
          </span>
          <Bone className="hidden h-4 w-32 md:block" />
          <Bone className="h-4 w-12" />
        </li>
      ))}
    </ul>
  );
}

/** Hiring-manager overview session queue card. */
export function SessionQueueCardSkeleton() {
  return (
    <div className={cn(portalPanelClass, "space-y-2 p-3")}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <Bone className="h-4 w-36" />
          <Bone className="h-3 w-48" />
        </div>
        <Bone className="h-5 w-14" />
      </div>
      <div className="flex items-center gap-2">
        <Bone className="h-1 flex-1 rounded-full" />
        <Bone className="h-3 w-8" />
      </div>
      <div className="flex items-center gap-2">
        <Bone className="h-4 w-16" />
        <Bone className="h-4 w-14" />
        <Bone className="ml-auto h-4 w-16" />
      </div>
    </div>
  );
}

/** Campaign detail page: entity header, tabs, next-step queue and stat tiles. */
export function CampaignDetailSkeleton({ label }: { label: string }) {
  return (
    <PortalSkeletonRegion label={label} className="space-y-6">
      <Bone className="h-9 w-40" />
      <div className="space-y-4 border-b border-border pb-5 sm:pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <Bone className="h-3 w-28" />
            <div className="flex flex-wrap items-center gap-2">
              <Bone className="h-8 w-64 max-w-full" />
              <Bone className="h-6 w-20" />
              <Bone className="h-6 w-20" />
            </div>
            <Bone className="h-4 w-72 max-w-full" />
          </div>
          <Bone className="h-11 w-40" />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {repeat(3, (index) => (
            <Bone key={index} className="h-4 w-36" />
          ))}
        </div>
      </div>
      <div className="flex gap-1 border-b border-border pb-2">
        {repeat(4, (index) => (
          <Bone key={index} className="h-8 w-28" />
        ))}
      </div>
      <div className={cn(portalPanelClass, "space-y-2 p-5")}>
        <Bone className="h-5 w-48" />
        <Bone className="h-4 w-80 max-w-full" />
        <Bone className="mt-3 h-16 w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {repeat(3, (index) => (
          <div key={index} className={portalStatTileClass}>
            <Bone className="h-3 w-24" />
            <Bone className="mt-2.5 h-7 w-16" />
            <Bone className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>
    </PortalSkeletonRegion>
  );
}
