"use client";

import {
  portalProgressBarClass,
  portalResultBandClass,
  portalResultBarFailClass,
  portalResultFailClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import {
  BreakdownSection,
  BreakdownSectionTitle,
  BreakdownStatTile,
} from "./breakdown-ui";
import {
  CriticalGates,
  StandardHeader,
  asCompetencies,
  asFlags,
  numberOrNull,
} from "./breakdown-common";
import type { AssessmentReportBreakdownProps } from "./types";

/** Fallback floors, used only if the backend has not sent them. */
const FALLBACK_FLOORS: Record<string, number> = {
  C1: 55,
  C2: 55,
  C3: 60,
  C4: 45,
  C5: 55,
  C6: 40,
};

function floorFor(floors: unknown, competencyId: string): number {
  if (floors && typeof floors === "object" && !Array.isArray(floors)) {
    const value = numberOrNull((floors as Record<string, unknown>)[competencyId]);
    if (value !== null) return value;
  }
  return FALLBACK_FLOORS[competencyId] ?? 50;
}

export function SituationalJudgementReportBreakdown({
  result,
}: AssessmentReportBreakdownProps) {
  if (!result?.metrics) return null;
  const metrics = result.metrics;

  const competencies = asCompetencies(metrics.competencyScores);
  const decisionBand =
    typeof metrics.decisionBand === "string" ? metrics.decisionBand : null;
  const rationale = Array.isArray(metrics.decisionRationale)
    ? (metrics.decisionRationale as string[])
    : [];
  const materialFlags = numberOrNull(metrics.materialRiskFlagCount) ?? 0;

  return (
    <div className="space-y-5">
      <StandardHeader metrics={metrics} />

      <div className="grid gap-3 sm:grid-cols-3">
        <BreakdownStatTile
          label="Decision band"
          value={decisionBand ?? "—"}
          valueClassName={cn("text-lg", portalResultBandClass(decisionBand))}
        />
        <BreakdownStatTile
          label="Material risk flags"
          value={materialFlags}
          valueClassName={cn("text-lg", materialFlags > 0 ? portalResultFailClass : undefined)}
        />
        <BreakdownStatTile
          label="Moderate risk flags"
          value={numberOrNull(metrics.moderateRiskFlagCount) ?? 0}
          valueClassName="text-lg"
        />
      </div>

      {rationale.length ? (
        <BreakdownSection title="Decision rationale">
          <ul className="space-y-1 text-sm text-muted-foreground">
            {rationale.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </BreakdownSection>
      ) : null}

      <div className="space-y-3">
        <BreakdownSectionTitle>Competency scores</BreakdownSectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {competencies.map((competency) => {
            const floor = floorFor(metrics.competencyFloors, competency.id);
            const isBelowFloor = competency.score < floor;

            return (
              <BreakdownSection key={competency.id} className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-3 text-xs">
                  <span
                    className="line-clamp-1 font-medium text-foreground"
                    title={competency.label}
                  >
                    {competency.label}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      isBelowFloor ? portalResultFailClass : "text-foreground",
                    )}
                  >
                    {Math.round(competency.score)}%
                  </span>
                </div>

                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted/40 dark:bg-white/10">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      isBelowFloor ? portalResultBarFailClass : portalProgressBarClass,
                    )}
                    style={{ width: `${Math.max(0, Math.min(100, competency.score))}%` }}
                  />
                  {/* Safety floor marker — the score alone does not tell a
                      hiring manager whether a competency gate was cleared. */}
                  <div
                    className="absolute bottom-0 top-0 w-0.5 bg-destructive/50"
                    style={{ left: `${Math.max(0, Math.min(100, floor))}%` }}
                    title={`Safety floor: ${floor}%`}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>
                    Floor: {floor}% · {competency.weight}% weight
                  </span>
                  {isBelowFloor ? (
                    <span className={cn("font-semibold", portalResultFailClass)}>
                      Below floor
                    </span>
                  ) : null}
                </div>
              </BreakdownSection>
            );
          })}
        </div>
      </div>

      <CriticalGates flags={asFlags(metrics.criticalFlags)} />
    </div>
  );
}
