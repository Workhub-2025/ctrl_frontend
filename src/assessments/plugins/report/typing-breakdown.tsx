import { portalCodeSurfaceClass } from "@/components/dashboard/portal/portal-design-tokens";
import type { AssessmentReportBreakdownProps } from "./types";
import { getTypingRuns } from "./shared";

export function TypingReportBreakdown({ result }: AssessmentReportBreakdownProps) {
  if (!result) return null;

  const typingRuns = getTypingRuns(result.metrics);

  return (
    <>
      {result.wpm !== null && result.wpm !== undefined && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
            <p className="text-xs text-slate-500 font-medium">Average Speed</p>
            <p className="mt-1.5 text-2xl font-black text-white">
              {result.wpm} <span className="text-xs font-semibold text-slate-400">WPM</span>
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
            <p className="text-xs text-slate-500 font-medium">Average Accuracy</p>
            <p className="mt-1.5 text-2xl font-black text-emerald-400">
              {result.accuracy ?? "—"}%
            </p>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
            <p className="text-xs text-slate-500 font-medium">Total Mistakes</p>
            <p className="mt-1.5 text-2xl font-black text-red-400">
              {result.mistakeCount ?? "—"}
            </p>
          </div>
        </div>
      )}

      {typingRuns.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
            Detailed Typing Run Performance
          </p>
          <div className={portalCodeSurfaceClass}>
            <table className="w-full max-w-full table-fixed text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/15 bg-white/[0.03] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Run</th>
                  <th className="p-3 text-right">WPM</th>
                  <th className="p-3 text-right">Accuracy</th>
                  <th className="p-3 text-right">Mistakes</th>
                  <th className="p-3 text-right">Characters (Correct/Total)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200 font-medium">
                {typingRuns.map((run, index) => (
                  <tr
                    key={`typing-run-${run.runIndex ?? index}`}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-3 text-slate-300 font-bold">
                      Run {run.runIndex ?? index + 1}
                    </td>
                    <td className="p-3 text-right text-white font-extrabold">{run.wpm ?? "—"}</td>
                    <td className="p-3 text-right text-emerald-400 font-extrabold">
                      {run.accuracy ?? "—"}%
                    </td>
                    <td className="p-3 text-right text-red-400 font-extrabold">
                      {run.mistakeCharacters ?? "0"}
                    </td>
                    <td className="p-3 text-right text-slate-400">
                      {run.correctCharacters ?? 0} / {run.typedCharacters ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
