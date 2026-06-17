"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AssessmentAttemptService,
  type AssessmentRecoveryMode,
  type CandidateAssessmentAttempt,
} from "@/services/assessment-attempt.service";
import {
  formatAssessmentSlugLabel,
  TIMED_ASSESSMENT_SLUGS,
} from "@/lib/assessment-result-status";

type VersionCatalog = Record<string, Array<{ version: string; title: string }>>;

type AssessmentRecoveryDialogProps = {
  attempt: CandidateAssessmentAttempt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecovered?: () => void;
  recoverFn?: (input: {
    candidateSessionDocumentId: string;
    assessmentSlug: string;
    action: AssessmentRecoveryMode;
    contentVersion?: string | null;
  }) => Promise<CandidateAssessmentAttempt>;
  versionsUrl?: string;
};

export function AssessmentRecoveryDialog({
  attempt,
  open,
  onOpenChange,
  onRecovered,
  recoverFn = AssessmentAttemptService.recover.bind(AssessmentAttemptService),
  versionsUrl = "/api/admin/assessment-versions",
}: AssessmentRecoveryDialogProps) {
  const [action, setAction] = useState<AssessmentRecoveryMode>("resume");
  const [contentVersion, setContentVersion] = useState("");
  const [versions, setVersions] = useState<VersionCatalog>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedSlug = attempt?.assessmentSlug ?? "";
  const isTimed = selectedSlug ? TIMED_ASSESSMENT_SLUGS.has(selectedSlug) : false;
  const versionOptions = useMemo(
    () => versions[selectedSlug] ?? [],
    [selectedSlug, versions]
  );

  useEffect(() => {
    if (!open) return;
    void fetch(versionsUrl, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { data: {} }))
      .then((body: { data?: VersionCatalog }) => setVersions(body.data ?? {}))
      .catch(() => setVersions({}));
  }, [open, versionsUrl]);

  useEffect(() => {
    if (!attempt) return;
    setAction(isTimed ? "restart" : "resume");
    setContentVersion(attempt.contentVersion ?? versionOptions[0]?.version ?? "");
    setSubmitError(null);
  }, [attempt, isTimed, versionOptions]);

  const handleRecover = async () => {
    if (!attempt?.candidateSessionDocumentId || !attempt.assessmentSlug) return;

    try {
      setSubmitting(true);
      setSubmitError(null);
      await recoverFn({
        candidateSessionDocumentId: attempt.candidateSessionDocumentId,
        assessmentSlug: attempt.assessmentSlug,
        action,
        contentVersion: action === "restart" ? contentVersion || null : null,
      });
      onOpenChange(false);
      onRecovered?.();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Recovery failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Recover assessment</DialogTitle>
          <DialogDescription>
            Unlock the candidate to resume from snapshot or restart with a new question set.
          </DialogDescription>
        </DialogHeader>

        {attempt ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
              <p className="font-medium text-foreground">
                {formatAssessmentSlugLabel(attempt.assessmentSlug ?? "assessment")}
              </p>
              <p className="mt-1 text-muted-foreground">
                {attempt.candidateSession?.campaign?.name ?? "Unknown campaign"}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recovery-action">Recovery action</Label>
              <Select
                value={action}
                onValueChange={(value) => setAction(value as AssessmentRecoveryMode)}
              >
                <SelectTrigger id="recovery-action">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resume" disabled={isTimed}>
                    Resume from snapshot
                  </SelectItem>
                  <SelectItem value="restart">Restart with new question set</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {action === "restart" ? (
              <div className="space-y-2">
                <Label htmlFor="content-version">Question set version</Label>
                <Select value={contentVersion} onValueChange={setContentVersion}>
                  <SelectTrigger id="content-version">
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versionOptions.map((option) => (
                      <SelectItem key={option.version} value={option.version}>
                        {option.title} ({option.version})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {attempt.snapshot ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-muted-foreground">
                <div className="mb-1 flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Snapshot preview
                </div>
                <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(attempt.snapshot, null, 2)}
                </pre>
              </div>
            ) : null}

            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={() => void handleRecover()} disabled={submitting || !attempt}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recovering…
              </>
            ) : (
              <>
                <RotateCcw className="mr-2 h-4 w-4" />
                Confirm recovery
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
