"use client";

import { Loader2, LogOut, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AssessmentReconnectOverlayProps = {
  open: boolean;
  secondsRemaining?: number;
};

export function AssessmentReconnectOverlay({
  open,
  secondsRemaining,
}: AssessmentReconnectOverlayProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="assessment-reconnect-title"
      aria-describedby="assessment-reconnect-description"
    >
      <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl dark:border-white/10">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <WifiOff className="h-7 w-7 animate-pulse" aria-hidden="true" />
        </div>
        <h2 id="assessment-reconnect-title" className="text-xl font-semibold text-foreground">
          Reconnecting…
        </h2>
        <p
          id="assessment-reconnect-description"
          className="mt-3 text-sm leading-6 text-muted-foreground"
        >
          Your connection was interrupted. The assessment is paused while we try to restore your
          session.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          <span>
            {typeof secondsRemaining === "number"
              ? `Time remaining before save: ${secondsRemaining}s`
              : "Checking connection…"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AssessmentPausedScreen({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-[520px] w-full max-w-2xl flex-col items-center justify-center px-6 text-center",
        className
      )}
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <WifiOff className="h-8 w-8" aria-hidden="true" />
      </div>
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
        Assessment paused
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">
        Your session was marked as abandoned because the connection could not be restored. Any
        available progress snapshot has been saved for audit review.
      </p>
      <p className="mt-3 max-w-lg text-xs text-muted-foreground">
        You can close this assessment and return to your assessment list.
      </p>
      <Button
        type="button"
        className="mt-6 rounded-lg"
        onClick={() => {
          window.location.href = "/candidate-dashboard/my-assessments";
        }}
      >
        <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
        Close assessment
      </Button>
    </div>
  );
}
