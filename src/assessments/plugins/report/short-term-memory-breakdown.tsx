"use client";

import {
  portalAlertErrorClass,
  portalProgressBarClass,
  portalResultSecondaryClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import {
  BreakdownMetricRow,
  BreakdownProgressTrack,
  BreakdownSection,
  BreakdownStatTile,
} from "./breakdown-ui";
import {
  CriticalGates,
  StandardHeader,
  asFlags,
  numberOrNull,
  roundOrDash,
} from "./breakdown-common";
import type { AssessmentReportBreakdownProps } from "./types";

export function ShortTermMemoryReportBreakdown({
  result,
}: AssessmentReportBreakdownProps) {
  if (!result?.metrics) return null;
  const metrics = result.metrics;

  const missedCriticalFacts = Array.isArray(metrics.missedCriticalFacts)
    ? (metrics.missedCriticalFacts as string[])
    : [];
  const distractionAccuracy = numberOrNull(metrics.distractionAccuracy);

  return (
    <div className="space-y-5">
      <StandardHeader metrics={metrics} />

      <div className="grid gap-3 sm:grid-cols-2">
        <BreakdownStatTile
          label="Recall accuracy"
          value={roundOrDash(metrics.factRecallAccuracy, "%")}
          valueClassName="text-lg"
        />
        <BreakdownStatTile
          label="Critical facts recalled"
          value={roundOrDash(metrics.criticalFactAccuracy, "%")}
          valueClassName="text-lg"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <BreakdownStatTile label="Sequencing" value={roundOrDash(metrics.sequenceScore, "%")} />
        <BreakdownStatTile
          label="Record correction"
          value={roundOrDash(metrics.correctionScore, "%")}
        />
        <BreakdownStatTile label="Timeliness" value={roundOrDash(metrics.timelinessScore, "%")} />
      </div>

      {distractionAccuracy !== null ? (
        <BreakdownSection>
          <BreakdownMetricRow
            label="Distraction task accuracy"
            value={`${Math.round(distractionAccuracy)}%`}
            valueClassName={portalResultSecondaryClass}
          />
          <BreakdownProgressTrack
            value={distractionAccuracy}
            className={portalProgressBarClass}
          />
        </BreakdownSection>
      ) : null}

      {numberOrNull(metrics.recallFieldCount) !== null ? (
        <BreakdownMetricRow
          label="Operational details recalled"
          value={`${metrics.recalledFieldCount} of ${metrics.recallFieldCount}`}
        />
      ) : null}

      {missedCriticalFacts.length > 0 ? (
        <div className={cn(portalAlertErrorClass, "space-y-2")}>
          <p className="text-xs font-semibold uppercase tracking-wide">
            Missed critical facts
          </p>
          <ul className="space-y-1 text-sm">
            {missedCriticalFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <CriticalGates flags={asFlags(metrics.criticalFlags)} />
    </div>
  );
}
