"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdminPanel, AdminSectionHeader } from "@/components/admin/admin-portal-ui";
import {
  portalSelectableCardClass,
  portalSelectableCardSelectedClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";

type SeatSlot = {
  seatNumber: number;
  seatLabel: string;
  managerName: string | null;
  managerEmail: string | null;
  managerStatus: "occupied" | "empty" | "previous";
};

type ExportState = {
  exportReferenceId: string;
  seatNumbers: number[];
  emailedAt: string;
};

export function AdminSeatDowngradePanel({
  clientId,
  currentSeatCount,
  minimumContractedSeats,
  onCompleted,
}: {
  clientId: string;
  currentSeatCount: number;
  minimumContractedSeats: number;
  onCompleted: () => void | Promise<void>;
}) {
  const [slots, setSlots] = useState<SeatSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [targetSeatCount, setTargetSeatCount] = useState(String(currentSeatCount));
  const [exportState, setExportState] = useState<ExportState | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/clients/${encodeURIComponent(clientId)}/seat-slots`,
        { cache: "no-store" },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((body as { error?: string }).error || "Seat slots could not be loaded");
      }
      setSlots((body.data ?? []) as SeatSlot[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seat slots could not be loaded");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    setTargetSeatCount(String(currentSeatCount));
    setSelectedSeats([]);
    setExportState(null);
  }, [clientId, currentSeatCount]);

  const parsedTarget = Number.parseInt(targetSeatCount, 10);
  const seatsToRemove = useMemo(() => {
    if (!Number.isInteger(parsedTarget) || parsedTarget >= currentSeatCount) return 0;
    return currentSeatCount - parsedTarget;
  }, [currentSeatCount, parsedTarget]);

  const toggleSeat = (seatNumber: number) => {
    setSelectedSeats((current) => {
      if (current.includes(seatNumber)) {
        return current.filter((value) => value !== seatNumber);
      }
      if (seatsToRemove > 0 && current.length >= seatsToRemove) {
        return current;
      }
      return [...current, seatNumber].sort((a, b) => a - b);
    });
    setExportState(null);
  };

  const selectionValid =
    seatsToRemove > 0
    && selectedSeats.length === seatsToRemove
    && parsedTarget >= minimumContractedSeats;

  const exportReady = selectionValid && !exportState;
  const deactivateReady =
    Boolean(exportState)
    && exportState?.seatNumbers.join(",") === selectedSeats.join(",")
    && selectionValid;

  const handleExport = async () => {
    if (!selectionValid) return;
    setExporting(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/clients/${encodeURIComponent(clientId)}/export-seats`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ seatNumbers: selectedSeats }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((body as { error?: string }).error || "Export email could not be sent");
      }
      const data = (body as { data?: ExportState }).data;
      if (!data?.exportReferenceId) {
        throw new Error("Export reference was not returned");
      }
      setExportState(data);
      setNotice(
        `Export emailed to the client contact(s). Reference ${data.exportReferenceId.slice(0, 8)}…`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export email could not be sent");
    } finally {
      setExporting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateReady || !exportState) return;
    setDeactivating(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/admin/clients/${encodeURIComponent(clientId)}/downgrade-seats`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seatNumbers: selectedSeats,
            exportReferenceId: exportState.exportReferenceId,
            newSeatCount: parsedTarget,
          }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error((body as { error?: string }).error || "Seat deactivation failed");
      }
      setConfirmOpen(false);
      setSelectedSeats([]);
      setExportState(null);
      setNotice("Selected seats were deactivated and contract capacity was updated.");
      await onCompleted();
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Seat deactivation failed");
    } finally {
      setDeactivating(false);
    }
  };

  if (currentSeatCount <= minimumContractedSeats) {
    return null;
  }

  return (
    <AdminPanel className="space-y-5">
      <AdminSectionHeader
        title="Seat downgrade workflow"
        description="Select seats to remove, export the workbook to the client by email, then deactivate once the export has been sent."
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {notice ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p> : null}

      <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-2">
          <Label htmlFor="target-seat-count">New contracted seat count</Label>
          <Input
            id="target-seat-count"
            type="number"
            min={minimumContractedSeats}
            max={Math.max(minimumContractedSeats, currentSeatCount - 1)}
            value={targetSeatCount}
            onChange={(event) => {
              setTargetSeatCount(event.target.value);
              setSelectedSeats([]);
              setExportState(null);
            }}
            className="rounded-xl"
          />
          <p className="text-xs text-muted-foreground">
            Current allocation: {currentSeatCount}. Contract minimum: {minimumContractedSeats}. Select{" "}
            {seatsToRemove > 0 ? seatsToRemove : 0} seat{seatsToRemove === 1 ? "" : "s"} to remove.
          </p>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading seat slots…
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {slots.map((slot) => {
                const selected = selectedSeats.includes(slot.seatNumber);
                return (
                  <button
                    key={slot.seatNumber}
                    type="button"
                    onClick={() => toggleSeat(slot.seatNumber)}
                    disabled={seatsToRemove <= 0}
                    className={cn(
                      selected ? portalSelectableCardSelectedClass : portalSelectableCardClass,
                      "p-3 text-left",
                      seatsToRemove <= 0 && "opacity-60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">{slot.seatLabel}</p>
                      <Badge variant="outline" className="rounded-md text-[10px] capitalize">
                        {slot.managerStatus}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {slot.managerName ?? "No active hiring manager"}
                    </p>
                    {slot.managerEmail ? (
                      <p className="truncate text-xs text-muted-foreground">{slot.managerEmail}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl gap-2"
          disabled={!exportReady || exporting}
          onClick={() => void handleExport()}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export &amp; email client
        </Button>

        <Button
          type="button"
          variant="destructive"
          className="rounded-xl gap-2"
          disabled={!deactivateReady || deactivating}
          onClick={() => setConfirmOpen(true)}
        >
          {deactivating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Deactivate selected seats
        </Button>
      </div>

      {!exportState ? (
        <p className="text-xs text-muted-foreground">
          Deactivation stays disabled until the Excel export has been emailed to the client and you
          receive the admin confirmation.
        </p>
      ) : null}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate selected seats?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm leading-relaxed">
              <p>
                Seats {selectedSeats.map((n) => `Seat ${n}`).join(", ")} will be permanently
                cleaned up: hiring manager access codes removed, manager login details anonymised,
                and campaigns, sessions, and results attached to those seats deleted.
              </p>
              <p className="font-medium text-amber-600 dark:text-amber-400">
                Candidate user accounts are not deleted. The export workbook was emailed before this
                step.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivating}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deactivating}
              onClick={() => void handleDeactivate()}
            >
              {deactivating ? "Deactivating…" : "Confirm deactivation"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminPanel>
  );
}
