import { portalProgressBarClass } from "@/components/dashboard/portal/portal-design-tokens";
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
        <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
          <p className="text-xs text-slate-500 font-medium">Recall accuracy</p>
          <p className="mt-1.5 text-lg font-bold text-white">
            {Math.round((metrics.factRecallAccuracy as number) ?? result.numericScore ?? 0)}%
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
          <p className="text-xs text-slate-500 font-medium">Critical facts recalled</p>
          <p className="mt-1.5 text-lg font-bold text-white">
            {Math.round((metrics.criticalFactAccuracy as number) ?? 0)}%
          </p>
        </div>
      </div>

      {typeof metrics.distractionAccuracy === "number" ? (
        <div className="space-y-2 rounded-lg border border-white/5 bg-white/[0.01] p-4">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-300 font-medium">Distraction task accuracy</span>
            <span className="font-bold text-sky-400">
              {Math.round(metrics.distractionAccuracy as number)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full ${portalProgressBarClass}`}
              style={{ width: `${metrics.distractionAccuracy}%` }}
            />
          </div>
        </div>
      ) : null}

      {missedCriticalFacts.length > 0 ? (
        <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-rose-300 mb-2">
            Missed critical facts
          </p>
          <ul className="space-y-1 text-sm text-rose-100">
            {missedCriticalFacts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
