"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpenCheck,
  Loader2,
  Send,
  TrendingUp,
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
import { DEFAULT_PLATFORM_ASSESSMENTS } from "@/lib/client/entitlements";
import type { ClientEntitlements } from "@/hooks/use-client-portal";

const REQUEST_COPY: Record<
  ClientInitiatedUpgradeType,
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
  assessment_version: {
    title: "Upgrade assessment version",
    description: "Move to a newer content version for an assessment you already use.",
    icon: TrendingUp,
  },
};

function compareVersions(a: string, b: string) {
  const left = a.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const right = b.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length, 3);
  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

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
  requestType: ClientInitiatedUpgradeType;
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
  const versionUpgradeAssessments = useMemo(() => {
    const fromEntitlements = entitlements?.versionUpgradeAssessments ?? [];
    if (fromEntitlements.length > 0) return fromEntitlements;
    return DEFAULT_PLATFORM_ASSESSMENTS.map((assessment) => ({
      slug: assessment.key,
      title: assessment.title,
      summary: assessment.description,
      maxVersion: "1.0.0",
    }));
  }, [entitlements?.versionUpgradeAssessments]);

  const [assessmentVersions, setAssessmentVersions] = useState<
    Record<string, Array<{ version: string; title: string; description: string | null }>>
  >({});

  const [requestedSeats, setRequestedSeats] = useState(String((currentSeats ?? 1) + 1));
  const [seatNotes, setSeatNotes] = useState("");
  const [assessmentSlug, setAssessmentSlug] = useState("");
  const [customAssessmentName, setCustomAssessmentName] = useState("");
  const [newAssessmentNotes, setNewAssessmentNotes] = useState("");
  const [requestedVersion, setRequestedVersion] = useState("");
  const [versionNotes, setVersionNotes] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const usingCustomAssessment = requestableAssessments.length === 0;

  const selectedVersionAssessment = useMemo(
    () => versionUpgradeAssessments.find((assessment) => assessment.slug === assessmentSlug),
    [assessmentSlug, versionUpgradeAssessments]
  );

  const selectedRequestAssessment = useMemo(() => {
    if (usingCustomAssessment) return null;
    return requestableAssessments.find((assessment) => assessment.slug === assessmentSlug) ?? null;
  }, [assessmentSlug, requestableAssessments, usingCustomAssessment]);

  const currentVersion =
    (selectedVersionAssessment as { maxVersion?: string } | undefined)?.maxVersion ?? "1.0.0";

  const versionOptions = useMemo(() => {
    if (!selectedVersionAssessment) return [];
    const available = assessmentVersions[selectedVersionAssessment.slug] ?? [];
    const sorted = [...available].sort((a, b) => compareVersions(a.version, b.version));
    const newer = sorted.filter((option) => compareVersions(option.version, currentVersion) > 0);
    return newer.length > 0 ? newer : sorted;
  }, [currentVersion, assessmentVersions, selectedVersionAssessment]);

  useEffect(() => {
    if (!open || requestType !== "assessment_version") return;
    void fetch("/api/client/assessment-versions", { cache: "no-store" })
      .then((response) => response.json())
      .then((body) => setAssessmentVersions(body.data ?? {}))
      .catch(() => setAssessmentVersions({}));
  }, [open, requestType]);

  useEffect(() => {
    if (!open) return;
    setRequestedSeats(String(Math.max((currentSeats ?? 1) + 1, 2)));
    setSeatNotes("");
    setCustomAssessmentName("");
    setNewAssessmentNotes("");
    setVersionNotes("");
    setFieldError(null);

    if (requestType === "new_assessment") {
      setAssessmentSlug(requestableAssessments[0]?.slug ?? "");
    } else if (requestType === "assessment_version") {
      setAssessmentSlug(versionUpgradeAssessments[0]?.slug ?? "");
    }
  }, [
    open,
    currentSeats,
    requestType,
    requestableAssessments,
    versionUpgradeAssessments,
  ]);

  useEffect(() => {
    const next = versionOptions.find((option) => compareVersions(option.version, currentVersion) > 0);
    setRequestedVersion(next?.version ?? versionOptions.at(-1)?.version ?? currentVersion);
  }, [assessmentSlug, currentVersion, versionOptions]);

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
        if (newAssessmentNotes.trim().length < 20) {
          setFieldError("Explain why you need this assessment (at least 20 characters).");
          return;
        }

        if (usingCustomAssessment) {
          if (customAssessmentName.trim().length < 3) {
            setFieldError("Enter the assessment name you want to add.");
            return;
          }
          await onSubmit({
            type: "new_assessment",
            assessmentSlug: "custom-request",
            assessmentLabel: customAssessmentName.trim(),
            notes: newAssessmentNotes.trim(),
          });
        } else {
          if (!selectedRequestAssessment) {
            setFieldError("Choose an assessment to request.");
            return;
          }
          await onSubmit({
            type: "new_assessment",
            assessmentSlug: selectedRequestAssessment.slug,
            assessmentLabel: selectedRequestAssessment.title,
            notes: newAssessmentNotes.trim(),
          });
        }
      }

      if (requestType === "assessment_version") {
        if (!selectedVersionAssessment) {
          setFieldError("Choose an assessment to upgrade.");
          return;
        }
        if (!requestedVersion || requestedVersion === currentVersion) {
          setFieldError("Choose a version higher than your current access.");
          return;
        }
        await onSubmit({
          type: "assessment_version",
          assessmentSlug: selectedVersionAssessment.slug,
          assessmentLabel: selectedVersionAssessment.title,
          currentVersion,
          requestedVersion,
          notes: versionNotes.trim() || undefined,
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

          {requestType === "new_assessment" && (
            <>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm dark:border-white/5">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  SJA, TA, PJA, and SCA are already included on every client platform. This request
                  is for add-on assessments only.
                </p>
              </div>

              {usingCustomAssessment ? (
                <div className="space-y-2">
                  <Label htmlFor="custom-assessment-name">Assessment to add</Label>
                  <Input
                    id="custom-assessment-name"
                    value={customAssessmentName}
                    onChange={(event) => setCustomAssessmentName(event.target.value)}
                    placeholder="Name of the assessment you want to add"
                    className="rounded-xl"
                  />
                  <p className="text-xs text-muted-foreground">
                    No add-on assessments are listed in the catalogue yet. Describe the assessment
                    you need and our team will confirm availability.
                  </p>
                </div>
              ) : (
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
              )}

              <div className="space-y-2">
                <Label htmlFor="new-assessment-notes">Why do you need this assessment?</Label>
                <Textarea
                  id="new-assessment-notes"
                  value={newAssessmentNotes}
                  onChange={(event) => setNewAssessmentNotes(event.target.value)}
                  placeholder="Describe the role, campaign, or business need (min. 20 characters)"
                  rows={4}
                  className="resize-none rounded-xl"
                />
              </div>
            </>
          )}

          {requestType === "assessment_version" && (
            <>
              <div className="space-y-2">
                <Label>Assessment</Label>
                <Select value={assessmentSlug} onValueChange={setAssessmentSlug}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select assessment" />
                  </SelectTrigger>
                  <SelectContent>
                    {versionUpgradeAssessments.map((assessment) => (
                      <SelectItem key={assessment.slug} value={assessment.slug}>
                        {assessment.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm dark:border-white/5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Current max version
                </p>
                <p className="mt-1 font-semibold text-foreground">v{currentVersion}</p>
              </div>
              <div className="space-y-2">
                <Label>Requested max version</Label>
                <Select value={requestedVersion} onValueChange={setRequestedVersion}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versionOptions.map((option) => (
                      <SelectItem key={option.version} value={option.version}>
                        Up to v{option.version}
                        {option.title ? ` · ${option.title}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="version-notes">Additional context (optional)</Label>
                <Textarea
                  id="version-notes"
                  value={versionNotes}
                  onChange={(event) => setVersionNotes(event.target.value)}
                  placeholder="Campaign timing or rollout notes"
                  rows={3}
                  className="resize-none rounded-xl"
                />
              </div>
            </>
          )}

          {fieldError ? (
            <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {fieldError}
            </p>
          ) : null}

          <Button type="submit" disabled={submitting} className="h-11 w-full rounded-xl font-semibold">
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
