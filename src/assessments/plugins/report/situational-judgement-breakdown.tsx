import { portalProgressBarClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import {
  BreakdownSection,
  BreakdownSectionTitle,
  BreakdownStatTile,
} from "./breakdown-ui";
import { AssessmentCompletionTag } from "./completion-tag";
import type { AssessmentReportBreakdownProps } from "./types";

const COMPETENCY_FLOORS: Record<string, number> = {
  C1: 55,
  C2: 55,
  C3: 60,
  C4: 45,
  C5: 55,
  C6: 40,
};

export function SituationalJudgementReportBreakdown({ result }: AssessmentReportBreakdownProps) {
  if (!result?.metrics) return null;

  const sjtMetrics = result.metrics as Record<string, unknown>;
  const competencyScores = (sjtMetrics.competencyScores as Record<string, number>) || {};
  const competencyLabels = (sjtMetrics.competencyLabels as Record<string, string>) || {};

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <AssessmentCompletionTag metrics={sjtMetrics} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <BreakdownStatTile
          label="Decision Band"
          value={(sjtMetrics.decisionBand as string) ?? "—"}
          valueClassName={cn(
            sjtMetrics.decisionBand === "GREEN"
              ? "text-emerald-600 dark:text-emerald-400"
              : sjtMetrics.decisionBand === "AMBER"
                ? "text-amber-600 dark:text-amber-400"
                : "text-destructive"
          )}
        />
        <BreakdownStatTile
          label="Material Risk Flags"
          value={(sjtMetrics.materialRiskFlagCount as number) ?? 0}
          valueClassName={
            ((sjtMetrics.materialRiskFlagCount as number) ?? 0) > 0
              ? "text-destructive"
              : undefined
          }
        />
        <BreakdownStatTile
          label="Moderate Risk Flags"
          value={(sjtMetrics.moderateRiskFlagCount as number) ?? 0}
        />
      </div>

      <div className="space-y-3">
        <BreakdownSectionTitle>Competency scores</BreakdownSectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(competencyScores).map(([key, score]) => {
            const label = competencyLabels[key] || key;
            const floor = COMPETENCY_FLOORS[key] ?? 50;
            const isBelowFloor = score < floor;

            return (
              <BreakdownSection key={key} className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-3 text-xs">
                  <span className="line-clamp-1 font-medium text-foreground" title={label}>
                    {label}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      isBelowFloor ? "text-destructive" : "text-foreground"
                    )}
                  >
                    {Math.round(score)}%
                  </span>
                </div>
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/40 dark:bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      isBelowFloor ? "bg-destructive" : portalProgressBarClass
                    )}
                    style={{ width: `${score}%` }}
                  />
                  <div
                    className="absolute bottom-0 top-0 w-0.5 bg-destructive/50"
                    style={{ left: `${floor}%` }}
                    title={`Safety Floor: ${floor}%`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Floor: {floor}%</span>
                  {isBelowFloor ? (
                    <span className="font-semibold text-destructive">Below floor</span>
                  ) : null}
                </div>
              </BreakdownSection>
            );
          })}
        </div>
      </div>
    </div>
  );
}
