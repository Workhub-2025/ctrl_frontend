import { cn } from "@/lib/utils";
import {
  BreakdownMetricRow,
  BreakdownProgressTrack,
  BreakdownSection,
  BreakdownStatTile,
} from "./breakdown-ui";
import { AssessmentCompletionTag } from "./completion-tag";
import type { AssessmentReportBreakdownProps } from "./types";

export function PrioritisationReportBreakdown({ result }: AssessmentReportBreakdownProps) {
  if (!result?.metrics) return null;

  const pjaMetrics = result.metrics as Record<string, unknown>;

  return (
    <div className="space-y-4">
      <AssessmentCompletionTag metrics={pjaMetrics} />
      <BreakdownSection title="Priority band accuracy">
        <div className="space-y-3">
          {[
            {
              label: "High Priority",
              score: (pjaMetrics.highPriorityAccuracy as number) ?? 0,
              barClass: "bg-emerald-500",
              valueClass: "text-emerald-600 dark:text-emerald-400",
            },
            {
              label: "Medium Priority",
              score: (pjaMetrics.mediumPriorityAccuracy as number) ?? 0,
              barClass: "bg-sky-500",
              valueClass: "text-sky-600 dark:text-sky-400",
            },
            {
              label: "Low Priority",
              score: (pjaMetrics.lowPriorityAccuracy as number) ?? 0,
              barClass: "bg-muted-foreground/60",
              valueClass: "text-muted-foreground",
            },
          ].map((band) => (
            <div key={band.label} className="space-y-1.5">
              <BreakdownMetricRow
                label={band.label}
                value={`${Math.round(band.score)}%`}
                valueClassName={band.valueClass}
              />
              <BreakdownProgressTrack value={band.score} className={band.barClass} />
            </div>
          ))}
        </div>
      </BreakdownSection>

      <div className="grid gap-3 sm:grid-cols-2">
        <BreakdownStatTile
          label="Outcome Band"
          value={(pjaMetrics.performanceBand as string) ?? (pjaMetrics.outcome as string) ?? "—"}
          valueClassName="text-lg"
        />
        <BreakdownStatTile
          label="Critical Misprioritisations"
          value={(pjaMetrics.criticalMisprioritisationCount as number) ?? 0}
          valueClassName={cn(
            "text-lg",
            ((pjaMetrics.criticalMisprioritisationCount as number) ?? 0) > 0
              ? "text-destructive"
              : undefined
          )}
        />
      </div>
    </div>
  );
}
