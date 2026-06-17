import { portalProgressBarClass } from "@/components/dashboard/portal/portal-design-tokens";
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
        <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
          <p className="text-xs text-slate-500 font-medium">Decision Band</p>
          <p
            className={`mt-1.5 text-2xl font-black ${
              sjtMetrics.decisionBand === "GREEN"
                ? "text-emerald-400"
                : sjtMetrics.decisionBand === "AMBER"
                  ? "text-amber-400"
                  : "text-rose-400"
            }`}
          >
            {(sjtMetrics.decisionBand as string) ?? "—"}
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
          <p className="text-xs text-slate-500 font-medium">Material Risk Flags</p>
          <p
            className={`mt-1.5 text-2xl font-black ${
              ((sjtMetrics.materialRiskFlagCount as number) ?? 0) > 0
                ? "text-rose-400 font-bold"
                : "text-white"
            }`}
          >
            {(sjtMetrics.materialRiskFlagCount as number) ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
          <p className="text-xs text-slate-500 font-medium">Moderate Risk Flags</p>
          <p className="mt-1.5 text-2xl font-black text-white">
            {(sjtMetrics.moderateRiskFlagCount as number) ?? 0}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
          Competency Scores
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(competencyScores).map(([key, score]) => {
            const label = competencyLabels[key] || key;
            const floor = COMPETENCY_FLOORS[key] ?? 50;
            const isBelowFloor = score < floor;

            return (
              <div
                key={key}
                className="rounded-lg border border-white/5 bg-white/[0.01] p-3 space-y-2"
              >
                <div className="flex justify-between items-start text-xs">
                  <span className="text-slate-300 font-medium line-clamp-1" title={label}>
                    {label}
                  </span>
                  <span className={`font-bold ${isBelowFloor ? "text-red-400" : "text-white"}`}>
                    {Math.round(score)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden relative">
                  <div
                    className={`h-full rounded-full ${isBelowFloor ? "bg-red-500" : "bg-primary"}`}
                    style={{ width: `${score}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-red-400/50"
                    style={{ left: `${floor}%` }}
                    title={`Safety Floor: ${floor}%`}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>Floor: {floor}%</span>
                  {isBelowFloor && <span className="text-red-400 font-semibold">Below Floor</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
