"use client";

import { createContext, useContext, useEffect } from "react";

/**
 * A clock owned by the current stage (a typing passage, a timed briefing),
 * shown in the shell header in the same place as the overall time limit.
 */
export type StageTimer = {
  /** Seconds left on the stage's clock. */
  seconds: number;
  /** Shown beside the clock, e.g. "Passage" or "Starts with first key". */
  label: string;
  /** While true, the shell's continue button waits for the clock. */
  holdsAdvance?: boolean;
};

export const StageTimerContext = createContext<((timer: StageTimer | null) => void) | null>(
  null,
);

/** Publishes a stage clock to the shell. Does nothing outside the shell (practice). */
export function useStageTimer(timer: StageTimer | null) {
  const publish = useContext(StageTimerContext);
  const seconds = timer?.seconds;
  const label = timer?.label;
  const holdsAdvance = timer?.holdsAdvance;
  useEffect(() => {
    if (!publish) return;
    publish(seconds === undefined || label === undefined ? null : { seconds, label, holdsAdvance });
  }, [publish, seconds, label, holdsAdvance]);
  useEffect(() => {
    if (!publish) return;
    return () => publish(null);
  }, [publish]);
}

export function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}
