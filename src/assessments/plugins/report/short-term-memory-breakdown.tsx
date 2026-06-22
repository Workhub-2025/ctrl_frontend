import { portalAlertErrorClass, portalProgressBarClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import {
  BreakdownMetricRow,
  BreakdownProgressTrack,
  BreakdownSection,
  BreakdownStatTile,
} from "./breakdown-ui";
import { AssessmentCompletionTag } from "./completion-tag";
import type { AssessmentReportBreakdownProps } from "./types";

export function ShortTermMemoryReportBreakdown({ result }: AssessmentReportBreakdownProps) {
  if (!result?.metrics) return null;

  const metrics = result.metrics as Record<string, unknown>;
  const missedCriticalFacts = Array.isArray(metrics.missedCriticalFacts)
    ? (metrics.missedCriticalFacts as string[])
    : [];

  return (
    <div className="space-y-4">
      <AssessmentCompletionTag metrics={metrics} />
      <div className="grid gap-3 sm:grid-cols-2">
        <BreakdownStatTile
          label="Recall accuracy"
          value={`${Math.round((metrics.factRecallAccuracy as number) ?? result.numericScore ?? 0)}%`}
          valueClassName="text-lg"
        />
        <BreakdownStatTile
          label="Critical facts recalled"
          value={`${Math.round((metrics.criticalFactAccuracy as number) ?? 0)}%`}
          valueClassName="text-lg"
        />
      </div>

      {typeof metrics.distractionAccuracy === "number" ? (
        <BreakdownSection>
          <BreakdownMetricRow
            label="Distraction task accuracy"
            value={`${Math.round(metrics.distractionAccuracy as number)}%`}
            valueClassName="text-sky-600 dark:text-sky-400"
          />
          <BreakdownProgressTrack
            value={metrics.distractionAccuracy as number}
            className={portalProgressBarClass}
          />
        </BreakdownSection>
      ) : null}

      {missedCriticalFacts.length > 0 ? (
        <div className={cn(portalAlertErrorClass, "space-y-2")}>
          <p className="text-xs font-semibold uppercase tracking-wide">Missed critical facts</p>
          <ul className="space-y-1 text-sm">
            {missedCriticalFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
