"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { AssessmentReportBreakdownProps } from "./types";

/**
 * Report breakdowns are code-split so their dependencies (notably Recharts in the
 * typing and prioritisation breakdowns) only load on pages that actually render a
 * report, not on every page that imports the plugin registry for titles or icons.
 */

function BreakdownLoadingPlaceholder() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading performance breakdown">
      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="aspect-[16/6] w-full" />
    </div>
  );
}

type Breakdown = ComponentType<AssessmentReportBreakdownProps>;

const loading = () => <BreakdownLoadingPlaceholder />;

export const TypingReportBreakdown: Breakdown = dynamic(
  () => import("./typing-breakdown").then((m) => m.TypingReportBreakdown),
  { loading },
);

export const SituationalJudgementReportBreakdown: Breakdown = dynamic(
  () => import("./situational-judgement-breakdown").then((m) => m.SituationalJudgementReportBreakdown),
  { loading },
);

export const PrioritisationReportBreakdown: Breakdown = dynamic(
  () => import("./prioritisation-breakdown").then((m) => m.PrioritisationReportBreakdown),
  { loading },
);

export const ShortTermMemoryReportBreakdown: Breakdown = dynamic(
  () => import("./short-term-memory-breakdown").then((m) => m.ShortTermMemoryReportBreakdown),
  { loading },
);

export const CallSimulationReportBreakdown: Breakdown = dynamic(
  () => import("./call-simulation-breakdown").then((m) => m.CallSimulationReportBreakdown),
  { loading },
);
