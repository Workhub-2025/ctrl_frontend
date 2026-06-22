"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  portalBadgeClass,
  portalLabelClass,
  portalTooltipContentClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import { getHmAssessmentItemStatus } from "@/lib/assessment-result-status";
import { isSameAssessment } from "@/lib/hiring-manager/assessment-matching";
import { computeWeightedCompositeScore } from "@/lib/hiring-manager/composite-score";
import type { HiringManagerAssessmentResult } from "@/services/hiring-manager-portal-client.service";

type AssessmentOverallScoreCellProps = {
  assessmentStack: string[];
  results: HiringManagerAssessmentResult[];
  weights?: Array<{ displayName: string; weight: number }>;
  className?: string;
};

function buildBreakdownRows(
  assessmentStack: string[],
  results: HiringManagerAssessmentResult[],
  weights?: Array<{ displayName: string; weight: number }>
) {
  return assessmentStack.map((name, index) => {
    const weight =
      weights?.find((item) => isSameAssessment(item.displayName, name))?.weight ??
      (assessmentStack.length > 0 ? Math.round(100 / assessmentStack.length) : 0);
    const result = results.find((item) => isSameAssessment(name, item.assessment)) ?? null;
    const status = result ? getHmAssessmentItemStatus(result) : "pending";
    const score = result?.numericScore ?? null;

    return {
      key: `${name}-${index}`,
      name,
      weight,
      status,
      score,
    };
  });
}

function ScoreRingSmall({ value }: { value: number | null }) {
  const normalized =
    typeof value === "number" && Number.isFinite(value)
      ? Math.max(0, Math.min(100, value))
      : null;
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const progress = normalized === null ? 0 : normalized / 100;

  return (
    <div className="relative h-8 w-8 shrink-0">
      <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32" aria-hidden="true">
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          className="stroke-muted/50"
          strokeWidth="3"
        />
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          className="stroke-primary"
          strokeLinecap="round"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-semibold tabular-nums text-foreground">
          {normalized === null ? "—" : normalized}
        </span>
      </div>
    </div>
  );
}

export function AssessmentOverallScoreCell({
  assessmentStack,
  results,
  weights,
  className,
}: AssessmentOverallScoreCellProps) {
  const stackForScore =
    weights && weights.length > 0
      ? weights.map((item) => ({
          displayName: item.displayName,
          weight: item.weight,
        }))
      : assessmentStack.map((displayName) => ({
          displayName,
          weight: assessmentStack.length > 0 ? 100 / assessmentStack.length : 0,
        }));

  const overallScore = computeWeightedCompositeScore(stackForScore, results);
  const breakdown = buildBreakdownRows(assessmentStack, results, weights);

  const statusLabel = (status: string) => {
    if (status === "completed") return "Completed";
    if (status === "abandoned") return "Abandoned";
    return "Pending";
  };

  const cell = (
    <div className={cn("flex items-center gap-2", className)}>
      <ScoreRingSmall value={overallScore} />
      <span className="text-xs font-semibold tabular-nums text-foreground">
        {overallScore === null ? "—" : `${overallScore}%`}
      </span>
    </div>
  );

  if (breakdown.length === 0) return cell;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="rounded-lg text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={
              overallScore === null
                ? "Overall score pending — view assessment breakdown"
                : `Overall score ${overallScore}% — view assessment breakdown`
            }
          >
            {cell}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className={portalTooltipContentClass}>
          <p className={cn(portalLabelClass, "mb-2")}>Assessment breakdown</p>
          <ul className="space-y-1.5">
            {breakdown.map((row) => (
              <li key={row.key} className="flex items-center justify-between gap-4 text-xs">
                <span className="min-w-0 truncate font-medium text-foreground">{row.name}</span>
                <span className="flex shrink-0 items-center gap-2 tabular-nums text-muted-foreground">
                  <span className={portalBadgeClass}>{statusLabel(row.status)}</span>
                  <span>{row.weight}% wt</span>
                  <span className="font-semibold text-foreground">
                    {row.score === null ? "—" : `${row.score}%`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
