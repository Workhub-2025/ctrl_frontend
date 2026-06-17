import { portalProgressBarClass } from "@/components/dashboard/portal/portal-design-tokens";
import { AssessmentCompletionTag } from "./completion-tag";
import type { AssessmentReportBreakdownProps } from "./types";

export function PrioritisationReportBreakdown({ result }: AssessmentReportBreakdownProps) {
  if (!result?.metrics) return null;

  const pjaMetrics = result.metrics as Record<string, unknown>;

  return (
    <div className="space-y-4">
      <AssessmentCompletionTag metrics={pjaMetrics} />
      <div className="space-y-3.5 rounded-lg border border-white/5 bg-white/[0.01] p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Priority Band Accuracy
        </p>
        <div className="space-y-3">
          {[
            {
              label: "High Priority",
              score: (pjaMetrics.highPriorityAccuracy as number) ?? 0,
              color: "bg-emerald-500",
              textColor: "text-emerald-400",
            },
            {
              label: "Medium Priority",
              score: (pjaMetrics.mediumPriorityAccuracy as number) ?? 0,
              color: "bg-sky-500",
              textColor: "text-sky-400",
            },
            {
              label: "Low Priority",
              score: (pjaMetrics.lowPriorityAccuracy as number) ?? 0,
              color: "bg-slate-400",
              textColor: "text-slate-400",
            },
          ].map((band) => (
            <div key={band.label} className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">{band.label}</span>
                <span className={`font-bold ${band.textColor}`}>{Math.round(band.score)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${band.color}`}
                  style={{ width: `${band.score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
          <p className="text-xs text-slate-500 font-medium">Outcome Band</p>
          <p className="mt-1.5 text-lg font-bold text-white">
            {(pjaMetrics.performanceBand as string) ?? (pjaMetrics.outcome as string) ?? "—"}
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
          <p className="text-xs text-slate-500 font-medium">Critical Misprioritisations</p>
          <p
            className={`mt-1.5 text-lg font-bold ${
              ((pjaMetrics.criticalMisprioritisationCount as number) ?? 0) > 0
                ? "text-rose-400"
                : "text-white"
            }`}
          >
            {(pjaMetrics.criticalMisprioritisationCount as number) ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}
