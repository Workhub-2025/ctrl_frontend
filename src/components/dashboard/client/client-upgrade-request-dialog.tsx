"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  Loader2,
  Send,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ClientInitiatedUpgradeType, ClientUpgradeRequestPayload } from "@/lib/client/entitlements";
import type { ClientEntitlements } from "@/hooks/use-client-portal";

const REQUEST_COPY: Record<
  Extract<ClientInitiatedUpgradeType, "seat_increase" | "new_assessment">,
  { title: string; description: string; icon: typeof Users }
> = {
  seat_increase: {
    title: "Increase hiring manager seats",
    description: "Request additional reusable hiring manager seats on your contract.",
    icon: Users,
  },
  new_assessment: {
    title: "Add new assessment",
    description: "Request an add-on assessment beyond the core SJA, TA, PJA, and SCA platform.",
    icon: BookOpenCheck,
  },
};

export function ClientUpgradeRequestDialog({
  open,
  onOpenChange,
  requestType,
  entitlements,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestType: Extract<ClientInitiatedUpgradeType, "seat_increase" | "new_assessment">;
  entitlements: ClientEntitlements | null;
  submitting: boolean;
  onSubmit: (payload: ClientUpgradeRequestPayload) => Promise<void>;
}) {
  const copy = REQUEST_COPY[requestType];
  const Icon = copy.icon;

  const currentSeats = entitlements?.contract?.seatCount ?? 0;
  const requestableAssessments = useMemo(
    () => entitlements?.requestableAssessments ?? [],
    [entitlements?.requestableAssessments]
  );

  const [requestedSeats, setRequestedSeats] = useState(String((currentSeats ?? 1) + 1));
  const [seatNotes, setSeatNotes] = useState("");
  const [assessmentSlug, setAssessmentSlug] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const selectedRequestAssessment = useMemo(
    () => requestableAssessments.find((assessment) => assessment.slug === assessmentSlug) ?? null,
    [assessmentSlug, requestableAssessments]
  );

  useEffect(() => {
    if (!open) return;
    setRequestedSeats(String(Math.max((currentSeats ?? 1) + 1, 2)));
    setSeatNotes("");
    setFieldError(null);

    if (requestType === "new_assessment") {
      setAssessmentSlug(requestableAssessments[0]?.slug ?? "");
    }
  }, [
    open,
    currentSeats,
    requestType,
    requestableAssessments,
  ]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFieldError(null);

    try {
      if (requestType === "seat_increase") {
        const seats = Number(requestedSeats);
        if (!Number.isInteger(seats) || seats < 1) {
          setFieldError("Enter a valid seat count.");
          return;
        }
        if (seats <= (currentSeats ?? 0)) {
          setFieldError(`Requested seats must be higher than your current ${currentSeats} seats.`);
          return;
        }
        await onSubmit({
          type: "seat_increase",
          currentSeats,
          requestedSeats: seats,
          notes: seatNotes.trim() || undefined,
        });
      }

      if (requestType === "new_assessment") {
        if (requestableAssessments.length === 0) {
          setFieldError("No add-on assessments are available to request.");
          return;
        }
        if (!selectedRequestAssessment) {
          setFieldError("Choose an assessment to request.");
          return;
        }
        await onSubmit({
          type: "new_assessment",
          assessmentSlug: selectedRequestAssessment.slug,
          assessmentLabel: selectedRequestAssessment.title,
        });
      }

      onOpenChange(false);
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : "Request could not be submitted");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[1.25rem] border border-border dark:border-white/10 dark:bg-[#0a0f1d]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <DialogTitle className="font-display text-xl font-semibold">{copy.title}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {copy.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5 pt-2">
          {requestType === "seat_increase" && (
            <>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm dark:border-white/5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Current allocation
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {currentSeats} contracted seats on your active plan
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="requested-seats">Requested total seats</Label>
                <Input
                  id="requested-seats"
                  type="number"
                  min={Math.max(1, (currentSeats ?? 0) + 1)}
                  value={requestedSeats}
                  onChange={(event) => setRequestedSeats(event.target.value)}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seat-notes">Additional context (optional)</Label>
                <Textarea
                  id="seat-notes"
                  value={seatNotes}
                  onChange={(event) => setSeatNotes(event.target.value)}
                  placeholder="Timeline, rollout plans, or commercial context"
                  rows={3}
                  className="resize-none rounded-xl"
                />
              </div>
            </>
          )}

          {requestType === "new_assessment" && requestableAssessments.length > 0 && (
            <>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm dark:border-white/5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  SJA, TA, PJA, and SCA are already included on every client platform. This request
                  is for add-on assessments only.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Add-on assessment</Label>
                <Select value={assessmentSlug} onValueChange={setAssessmentSlug}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select assessment" />
                  </SelectTrigger>
                  <SelectContent>
                    {requestableAssessments.map((assessment) => (
                      <SelectItem key={assessment.slug} value={assessment.slug}>
                        {assessment.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRequestAssessment?.summary ? (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {selectedRequestAssessment.summary}
                  </p>
                ) : null}
              </div>
            </>
          )}

          {requestType === "new_assessment" && requestableAssessments.length === 0 ? (
            <p className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground dark:border-white/5">
              All available add-on assessments are already on your account, or none are listed in
              the catalogue yet.
            </p>
          ) : null}

          {fieldError ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {fieldError}
            </p>
          ) : null}

          <Button
            type="submit"
            disabled={
              submitting ||
              (requestType === "new_assessment" && requestableAssessments.length === 0)
            }
            className="h-11 w-full rounded-xl font-semibold"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                Submitting request…
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                Submit upgrade request
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
