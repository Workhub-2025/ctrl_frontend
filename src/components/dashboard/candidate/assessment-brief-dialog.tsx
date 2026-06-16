"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Monitor, PlayCircle, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AssessmentBrief = {
  title: string;
  description: string;
  duration?: string;
  icon: LucideIcon;
  href: string;
};

type AssessmentBriefDialogProps = {
  assessment: AssessmentBrief | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: () => void;
};

export function AssessmentBriefDialog({
  assessment,
  open,
  onOpenChange,
  onStart,
}: AssessmentBriefDialogProps) {
  if (!assessment) return null;

  const Icon = assessment.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden sm:max-w-[480px]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          aria-hidden="true"
        />
        <DialogHeader className="pr-10">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="space-y-1">
              <DialogTitle className="font-display text-lg font-bold tracking-tight">
                {assessment.title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed">
                Review what to expect before you begin. Your responses are submitted
                securely once you finish.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <p className="text-sm leading-relaxed text-muted-foreground">
            {assessment.description}
          </p>

          <div className="flex flex-wrap gap-2">
            {assessment.duration ? (
              <Badge variant="outline" className="gap-1.5 rounded-lg px-2.5 py-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {assessment.duration}
              </Badge>
            ) : null}
            <Badge variant="outline" className="gap-1.5 rounded-lg px-2.5 py-1">
              <Monitor className="h-3.5 w-3.5" aria-hidden="true" />
              Desktop recommended
            </Badge>
            <Badge variant="outline" className="gap-1.5 rounded-lg px-2.5 py-1">
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              Secure mode
            </Badge>
          </div>

          <ul className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground dark:border-white/5">
            <li>Find a quiet space with a stable internet connection.</li>
            <li>Allow pop-ups when prompted — assessments open in a secure window.</li>
            <li>Do not refresh or navigate away once an assessment has started.</li>
          </ul>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl font-semibold"
              onClick={() => onOpenChange(false)}
            >
              Not yet
            </Button>
            <Button
              type="button"
              className="h-10 gap-2 rounded-xl font-semibold"
              onClick={() => {
                onOpenChange(false);
                onStart();
              }}
            >
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              Continue to checks
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
