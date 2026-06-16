"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BriefcaseBusiness,
  ClipboardCheck,
  KeyRound,
  RefreshCw,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ClientErrorBanner,
  ClientPageHeader,
  ClientRefreshButton,
} from "@/components/dashboard/client/client-portal-ui";
import {
  PortalEmptyState,
  PortalPanel,
  PortalSectionHeader,
} from "@/components/dashboard/portal/portal-ui";
import {
  portalBadgeClass,
  portalIconWrapClass,
  portalPanelClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { formatDateTime } from "@/components/dashboard/client/client-portal-utils";
import type { SeatSlot } from "@/hooks/use-client-portal";
import { useClientPortal } from "@/context/client-portal-provider";
import type { ClientHiringManagerSeat } from "@/services/client-portal.service";
import { cn } from "@/lib/utils";

export function ClientHiringManagersContent() {
  const {
    summary,
    seatSlots,
    previousHiringManagers,
    loading,
    error,
    codeBusy,
    releasingManagerId,
    loadOverview,
    generateSeatCode,
    refreshSeatCode,
    releaseHiringManager,
  } = useClientPortal();

  const [selectedSeat, setSelectedSeat] = useState<SeatSlot | null>(null);
  const [pendingSeatLabel, setPendingSeatLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingSeatLabel) return;
    const seat = seatSlots.find(
      (slot) =>
        slot.label === pendingSeatLabel &&
        slot.type === "empty" &&
        Boolean(slot.accessCode?.code)
    );
    if (seat) {
      setSelectedSeat(seat);
      setPendingSeatLabel(null);
    }
  }, [pendingSeatLabel, seatSlots]);

  const openEmptySeat = async (seat: Extract<SeatSlot, { type: "empty" }>) => {
    if (seat.accessCode?.code) {
      setSelectedSeat(seat);
      return;
    }
    setPendingSeatLabel(seat.label);
    await generateSeatCode(seat.label);
  };

  const handleRefreshCode = async (seat: Extract<SeatSlot, { type: "empty" }>) => {
    if (!seat.accessCode?.documentId) return;
    await refreshSeatCode(seat.label, seat.accessCode.documentId);
    setSelectedSeat(seat);
  };

  const handleRelease = async (manager: ClientHiringManagerSeat) => {
    await releaseHiringManager(manager);
    setSelectedSeat(null);
  };

  return (
    <div className="relative mx-auto max-w-7xl space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <ClientPageHeader
        title="Hiring managers"
        description="Seat access and hiring-manager activity for this client account."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {summary ? (
              <Badge variant="outline" className="font-medium">
                {summary.seats.available} open seat{summary.seats.available === 1 ? "" : "s"}
              </Badge>
            ) : null}
            <ClientRefreshButton onClick={() => void loadOverview(true)} loading={loading} />
          </div>
        }
        notice={error ? <ClientErrorBanner message={error} /> : null}
      />

      <PortalPanel>
        <div className="space-y-6 p-6">
          <PortalSectionHeader
            eyebrow="Seat matrix"
            title="Active seats"
            description="Occupied seats show hiring-manager workspaces. Empty seats can issue invite codes."
          />

          {loading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 motion-safe:animate-spin text-primary" aria-hidden="true" />
              Loading hiring-manager seats…
            </p>
          )}

          {!loading && seatSlots.length === 0 && (
            <PortalEmptyState
              icon={Users}
              title="No seats configured"
              description="No hiring-manager seats are available on this contract."
            />
          )}

          {!loading && seatSlots.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {seatSlots.map((seat) => (
                <SeatCard
                  key={seat.label}
                  seat={seat}
                  codeBusy={codeBusy === seat.label}
                  releasingManagerId={releasingManagerId}
                  onOpenOccupied={() => setSelectedSeat(seat)}
                  onOpenEmpty={() => {
                    if (seat.type === "empty") void openEmptySeat(seat);
                  }}
                  onRefreshCode={() => {
                    if (seat.type === "empty") void handleRefreshCode(seat);
                  }}
                  onRelease={(manager) => void handleRelease(manager)}
                />
              ))}
            </div>
          )}

          {!loading && previousHiringManagers.length > 0 && (
            <div className="border-t border-border/50 pt-6 dark:border-white/5">
              <PortalSectionHeader
                eyebrow="History"
                title="Previous seat occupants"
                description="Retained for historical campaigns and candidate records only."
                action={
                  <Badge variant="outline" className="rounded-lg border-border bg-card text-muted-foreground dark:border-white/10">
                    {previousHiringManagers.length} previous
                  </Badge>
                }
                className="mb-4"
              />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {previousHiringManagers.map((manager) => (
                  <button
                    key={manager.documentId}
                    type="button"
                    onClick={() => setSelectedSeat({ type: "occupied", label: "Previous", manager })}
                    className={cn(portalPanelClass, "p-4 text-left transition-colors hover:border-primary/30")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{manager.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{manager.email}</p>
                      </div>
                      <Badge variant="outline" className="rounded-md border-slate-500/20 text-muted-foreground">
                        Previous
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <MiniPanel label="Campaigns" value={manager.campaigns.length} icon={BriefcaseBusiness} />
                      <MiniPanel label="Candidates" value={manager.candidatesOnboarded} icon={UserCheck} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </PortalPanel>

      <Dialog open={Boolean(selectedSeat)} onOpenChange={(open) => !open && setSelectedSeat(null)}>
        <DialogContent className="max-w-md rounded-[1.25rem] border border-border dark:border-white/10 dark:bg-[#0a0f1d]">
          {selectedSeat?.type === "empty" && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl font-semibold">
                  {selectedSeat.label} access code
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Share this code with the hiring manager assigned to this seat.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 pt-3">
                <div className="relative overflow-hidden rounded-xl border border-border bg-muted/40 p-5 shadow-inner dark:border-white/10 dark:bg-white/[0.02]">
                  <p className="break-all text-center font-mono text-2xl font-bold tracking-widest text-primary">
                    {selectedSeat.accessCode?.code ?? "No code available"}
                  </p>
                </div>
                <div className="grid gap-1.5 text-xs text-muted-foreground">
                  <p>
                    Last refresh:{" "}
                    {formatDateTime(
                      selectedSeat.accessCode?.updatedAt ?? selectedSeat.accessCode?.createdAt
                    )}
                  </p>
                  <p>Expires: {formatDateTime(selectedSeat.accessCode?.expiresAt)}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 rounded-xl"
                  onClick={() => void handleRefreshCode(selectedSeat)}
                  disabled={!selectedSeat.accessCode || codeBusy === selectedSeat.label}
                >
                  <RefreshCw
                    className={cn("h-4 w-4", codeBusy === selectedSeat.label && "motion-safe:animate-spin")}
                    aria-hidden="true"
                  />
                  {codeBusy === selectedSeat.label ? "Refreshing…" : "Refresh code"}
                </Button>
              </div>
            </>
          )}
          {selectedSeat?.type === "occupied" && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl font-semibold">
                  {selectedSeat.manager.name}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {selectedSeat.manager.email}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 pt-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/30 p-4 shadow-inner dark:border-white/10 dark:bg-white/[0.02]">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Campaigns
                    </p>
                    <p className="mt-1 font-display text-3xl font-semibold text-foreground">
                      {selectedSeat.manager.campaigns.length}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 shadow-inner dark:border-white/10 dark:bg-white/[0.02]">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Onboarded
                    </p>
                    <p className="mt-1 font-display text-3xl font-semibold text-foreground">
                      {selectedSeat.manager.candidatesOnboarded}
                    </p>
                  </div>
                </div>
                <div className="max-h-[300px] space-y-3 overflow-y-auto pr-1">
                  {selectedSeat.manager.campaigns.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                      No campaigns are attached to this hiring manager.
                    </p>
                  )}
                  {selectedSeat.manager.campaigns.map((campaign) => (
                    <div
                      key={campaign.documentId}
                      className={cn(portalPanelClass, "space-y-3 p-4 transition-colors hover:border-primary/20")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{campaign.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{campaign.jobRole}</p>
                        </div>
                        <BriefcaseBusiness className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-md px-2 py-0.5 text-xs">
                          {campaign.campaignStatus}
                        </Badge>
                        <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-xs dark:bg-white/5">
                          {campaign.approvalStatus}
                        </Badge>
                        <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-xs dark:bg-white/5">
                          {campaign.candidatesOnboarded} candidates
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedSeat.manager.status !== "previous" && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-xl border-orange-500/20 text-orange-500 hover:!border-orange-500/50 hover:!bg-orange-500/10 hover:!text-orange-500"
                    onClick={() => void handleRelease(selectedSeat.manager)}
                    disabled={releasingManagerId === selectedSeat.manager.documentId}
                  >
                    {releasingManagerId === selectedSeat.manager.documentId ? (
                      <RefreshCw className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                    ) : (
                      <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                    )}
                    {releasingManagerId === selectedSeat.manager.documentId
                      ? "Releasing seat…"
                      : "Release seat"}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SeatCard({
  seat,
  codeBusy,
  releasingManagerId,
  onOpenOccupied,
  onOpenEmpty,
  onRefreshCode,
  onRelease,
}: {
  seat: SeatSlot;
  codeBusy: boolean;
  releasingManagerId: string | null;
  onOpenOccupied: () => void;
  onOpenEmpty: () => void;
  onRefreshCode: () => void;
  onRelease: (manager: ClientHiringManagerSeat) => void;
}) {
  return (
    <div
      className={cn(
        "relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:scale-[1.01]",
        seat.type === "occupied"
          ? cn(portalPanelClass, "hover:border-primary/30")
          : "border-2 border-dashed border-border/80 bg-transparent hover:border-primary/40 dark:border-white/10 dark:hover:border-primary/45"
      )}
    >
      {seat.type === "occupied" ? (
        <div className="flex h-full flex-col justify-between space-y-4">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-gradient-to-tr from-primary/30 to-indigo-500/25 text-xs font-bold text-foreground shadow-sm">
                {seat.manager.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold leading-snug text-foreground">
                  {seat.manager.name}
                </h3>
                <p className="truncate text-xs leading-snug text-muted-foreground">{seat.manager.email}</p>
              </div>
            </div>
            <Badge className="shrink-0 rounded-lg border-primary/15 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {seat.label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border/40 pt-3 dark:border-white/5">
            <div className="rounded-xl border border-border/20 bg-muted/10 p-2 text-center dark:border-white/5 dark:bg-white/[0.01]">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Campaigns
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                {seat.manager.campaigns.length}
              </p>
            </div>
            <div className="rounded-xl border border-border/20 bg-muted/10 p-2 text-center dark:border-white/5 dark:bg-white/[0.01]">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                Onboarded
              </p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
                {seat.manager.candidatesOnboarded}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs font-semibold"
              onClick={onOpenOccupied}
            >
              View workspaces
            </Button>
            {seat.manager.status !== "previous" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl border border-transparent px-2 text-red-500 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-600"
                onClick={() => onRelease(seat.manager)}
                disabled={releasingManagerId === seat.manager.documentId}
                aria-label="Release seat"
                title="Release seat"
              >
                {releasingManagerId === seat.manager.documentId ? (
                  <RefreshCw className="h-4 w-4 motion-safe:animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-full flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Capacity limit
            </span>
            <Badge className="rounded-lg border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {seat.label}
            </Badge>
          </div>

          {seat.accessCode ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className={cn("flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest", portalBadgeClass)}>
                  <span className="h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
                  Invite code active
                </span>
                <span className="text-[9px] text-muted-foreground">Expires in 7 days</span>
              </div>
              <div className={cn(portalPanelClass, "flex items-center gap-1.5 px-3 py-2 font-mono text-sm font-semibold shadow-inner")}>
                <span className="flex-1 select-all truncate">{seat.accessCode.code}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(portalIconWrapClass, "h-6 w-6 rounded-md")}
                  onClick={() => {
                    if (seat.accessCode?.code) {
                      void navigator.clipboard.writeText(seat.accessCode.code);
                    }
                  }}
                  aria-label="Copy invite code"
                  title="Copy code"
                >
                  <ClipboardCheck className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl text-xs font-semibold"
                onClick={onRefreshCode}
                disabled={codeBusy}
              >
                <RefreshCw className={cn("mr-1.5 h-3 w-3", codeBusy && "motion-safe:animate-spin")} />
                Regenerate key
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-2 text-center">
              <KeyRound className="mb-2.5 h-7 w-7 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">Available slot</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">Issue key to invite a manager.</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full rounded-xl text-xs font-semibold hover:border-primary/50"
                onClick={onOpenEmpty}
                disabled={codeBusy}
              >
                {codeBusy ? "Generating…" : "Generate invite key"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MiniPanel({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 shadow-inner dark:border-white/5 dark:bg-[#04070d]/50">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
