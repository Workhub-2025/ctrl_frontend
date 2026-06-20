"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Send, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PortalSectionHeader } from "@/components/dashboard/portal/portal-ui";
import { portalPanelClass } from "@/components/dashboard/portal/portal-design-tokens";
import type { SeatSlot } from "@/hooks/use-client-portal";
import type { ClientUpgradeRequestPayload } from "@/lib/client/entitlements";
import { cn } from "@/lib/utils";

function slotManagerName(slot: SeatSlot) {
  if (slot.type === "occupied") return slot.manager.name;
  return null;
}

function slotManagerEmail(slot: SeatSlot) {
  if (slot.type === "occupied") return slot.manager.email;
  return null;
}

export function ClientSeatDecreasePanel({
  currentSeats,
  seatSlots,
  canRequestUpgrades,
  submitting,
  onSubmit,
}: {
  currentSeats: number;
  seatSlots: SeatSlot[];
  canRequestUpgrades: boolean;
  submitting: boolean;
  onSubmit: (payload: ClientUpgradeRequestPayload) => Promise<void>;
}) {
  const [targetSeatCount, setTargetSeatCount] = useState(String(currentSeats));
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    setTargetSeatCount(String(currentSeats));
    setSelectedSeats([]);
    setNotes("");
    setFieldError(null);
  }, [currentSeats]);

  const parsedTarget = Number.parseInt(targetSeatCount, 10);
  const seatsToRemove = useMemo(() => {
    if (!Number.isInteger(parsedTarget) || parsedTarget >= currentSeats) return 0;
    return currentSeats - parsedTarget;
  }, [currentSeats, parsedTarget]);

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
  };

  const selectionValid =
    seatsToRemove > 0 && selectedSeats.length === seatsToRemove && parsedTarget >= 1;

  const handleSubmit = async () => {
    setFieldError(null);

    if (!selectionValid) {
      setFieldError(
        seatsToRemove <= 0
          ? "Enter a seat count lower than your current allocation."
          : `Select exactly ${seatsToRemove} seat${seatsToRemove === 1 ? "" : "s"} to remove.`,
      );
      return;
    }

    try {
      await onSubmit({
        type: "seat_decrease",
        currentSeats,
        requestedSeats: parsedTarget,
        seatNumbersToRemove: selectedSeats,
        notes: notes.trim() || undefined,
      });
      setTargetSeatCount(String(currentSeats));
      setSelectedSeats([]);
      setNotes("");
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : "Request could not be submitted");
    }
  };

  if (currentSeats <= 1) {
    return null;
  }

  return (
    <div className="space-y-5">
      <PortalSectionHeader
        eyebrow="Reduce seats"
        title="Request a seat reduction"
        description={
          canRequestUpgrades
            ? "Choose your new seat count and select which hiring manager seats to remove. CTRL will export data and process the downgrade — no invoice is required."
            : "Seat reduction requests will be available once your organisation has a contract on file."
        }
      />

      {!canRequestUpgrades ? (
        <p className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground dark:border-white/5">
          Contact CTRL support if you need help reducing your seat allocation.
        </p>
      ) : null}

      <div className={cn("space-y-5", !canRequestUpgrades && "pointer-events-none opacity-60")}>
        <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label htmlFor="client-target-seat-count">New contracted seat count</Label>
            <Input
              id="client-target-seat-count"
              type="number"
              min={1}
              max={Math.max(1, currentSeats - 1)}
              value={targetSeatCount}
              onChange={(event) => {
                setTargetSeatCount(event.target.value);
                setSelectedSeats([]);
              }}
              className="rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              Current allocation: {currentSeats}. Select {seatsToRemove > 0 ? seatsToRemove : 0}{" "}
              seat{seatsToRemove === 1 ? "" : "s"} to remove.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Users className="h-4 w-4" aria-hidden="true" />
              Seats to remove
            </div>
            {seatSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">Loading seat slots…</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {seatSlots.map((slot) => {
                  const selected = selectedSeats.includes(slot.seatNumber);
                  const managerName = slotManagerName(slot);
                  const managerEmail = slotManagerEmail(slot);
                  return (
                    <button
                      key={slot.seatNumber}
                      type="button"
                      onClick={() => toggleSeat(slot.seatNumber)}
                      disabled={seatsToRemove <= 0}
                      className={cn(
                        portalPanelClass,
                        "p-3 text-left transition-colors",
                        selected && "border-primary/40 bg-primary/5",
                        seatsToRemove <= 0 && "opacity-60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{slot.label}</p>
                        <Badge variant="outline" className="rounded-md text-[10px] capitalize">
                          {slot.type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {managerName ?? "No active hiring manager"}
                      </p>
                      {managerEmail ? (
                        <p className="truncate text-xs text-muted-foreground">{managerEmail}</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="seat-decrease-notes">Additional notes (optional)</Label>
          <Textarea
            id="seat-decrease-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Any context for CTRL when processing this reduction…"
            className="min-h-[80px] rounded-xl"
          />
        </div>

        {fieldError ? (
          <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {fieldError}
          </p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          disabled={!canRequestUpgrades || submitting || !selectionValid}
          className="h-11 w-full rounded-xl font-semibold gap-2"
          onClick={() => void handleSubmit()}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              Submitting request…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              Submit seat reduction request
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          After submission, CTRL will export seat data, remove the selected seats, and update your
          contract. You will not receive an invoice for seat reductions.
        </p>
      </div>
    </div>
  );
}
