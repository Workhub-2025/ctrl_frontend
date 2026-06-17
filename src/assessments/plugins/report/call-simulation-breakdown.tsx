"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  portalCodeSurfaceClass,
  portalProgressBarClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import type { HiringManagerAssessmentResult } from "@/services/hiring-manager-portal-client.service";
import type { AssessmentReportBreakdownProps } from "./types";

type CallSimulationRun = {
  runIndex: number;
  metrics?: Record<string, unknown>;
};

type CriterionRow = {
  key: string;
  displayName: string;
  critical?: boolean;
  section: string;
  score: number;
  maxScore: number;
};

function getCallSimulationRuns(result?: HiringManagerAssessmentResult | null): CallSimulationRun[] {
  const rawCalls = result?.rawData?.calls;
  const rawSnapshots = result?.rawData?.snapshots;
  const metricCalls = result?.metrics?.calls;
  const runs = Array.isArray(metricCalls)
    ? metricCalls
    : Array.isArray(rawCalls)
      ? rawCalls
      : Array.isArray(rawSnapshots)
        ? rawSnapshots
        : [];

  return runs as CallSimulationRun[];
}

const SECTION_LABELS: Record<string, string> = {
  caller_information: "Caller Information",
  system_information: "System Information",
  intelligence_information: "Intelligence Information",
  incident_information: "Incident Information",
};

const SECTION_KEYS = [
  "caller_information",
  "system_information",
  "intelligence_information",
  "incident_information",
];

function getRunScore(finalRuns: CallSimulationRun[], runIndex: number, criterionKey: string) {
  const run = finalRuns.find((r) => r.runIndex === runIndex);
  const criteria = run?.metrics?.criteria;
  if (!Array.isArray(criteria)) return "—";
  const crit = criteria.find((c) => (c as CriterionRow).key === criterionKey) as CriterionRow | undefined;
  return crit ? `${crit.score} / ${crit.maxScore}` : "—";
}

export function CallSimulationReportBreakdown({ result }: AssessmentReportBreakdownProps) {
  const [selectedCallRunIndex, setSelectedCallRunIndex] = useState<number | null>(null);

  if (!result?.metrics) return null;

  const callsList = getCallSimulationRuns(result);
  const finalRuns = callsList.filter((c) => c.metrics);

  let activeMetrics = result.metrics as Record<string, unknown>;
  let activeRunIndex = selectedCallRunIndex;

  if (finalRuns.length > 0) {
    if (activeRunIndex === null || !finalRuns.some((f) => f.runIndex === activeRunIndex)) {
      activeRunIndex = finalRuns[0].runIndex;
    }
    const matchedRun = finalRuns.find((f) => f.runIndex === activeRunIndex);
    if (matchedRun?.metrics) {
      activeMetrics = matchedRun.metrics as Record<string, unknown>;
    }
  }

  const criteriaList = (
    (activeMetrics.criteria as CriterionRow[] | undefined) ??
    (finalRuns[0]?.metrics?.criteria as CriterionRow[] | undefined) ??
    []
  );

  return (
    <div className="space-y-5">
      {finalRuns.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-white/5 pb-3">
          <span className="text-xs font-semibold text-slate-400 mr-2">Select Call:</span>
          {finalRuns.map((run, idx) => {
            const runMetrics = run.metrics as Record<string, unknown> | undefined;
            const isSelected = activeRunIndex === run.runIndex;
            return (
              <Button
                key={run.runIndex}
                type="button"
                variant={isSelected ? "default" : "outline"}
                onClick={() => setSelectedCallRunIndex(run.runIndex)}
                className={`h-7 px-3 text-[11px] font-bold rounded-lg transition-all ${
                  isSelected
                    ? "bg-primary text-white shadow-lg"
                    : "text-slate-300 hover:text-white hover:bg-white/5 border-white/10"
                }`}
              >
                Call {idx + 1} {runMetrics?.passed ? " (Pass)" : " (Review)"}
              </Button>
            );
          })}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
          <p className="text-xs text-slate-500 font-medium">Scoring Outcome</p>
          <p
            className={`mt-1.5 text-2xl font-black ${
              activeMetrics.passed ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {activeMetrics.passed ? "PASSED" : "FAILED"}
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
          <p className="text-xs text-slate-500 font-medium">Critical Errors</p>
          <p
            className={`mt-1.5 text-2xl font-black ${
              ((activeMetrics.criticalErrorsCount as number) ?? 0) > 0
                ? "text-rose-400 font-bold"
                : "text-white"
            }`}
          >
            {(activeMetrics.criticalErrorsCount as number) ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-white/5 bg-white/[0.01] p-3.5">
          <p className="text-xs text-slate-500 font-medium">Marks Awarded</p>
          <p className="mt-1.5 text-2xl font-black text-white">
            {(activeMetrics.totalEarnedScore as string | number) ?? "0"}{" "}
            <span className="text-xs font-semibold text-slate-400">
              / {(activeMetrics.maxScore as string | number) ?? "5.0"}
            </span>
          </p>
        </div>
      </div>

      <div className="space-y-3.5 rounded-lg border border-white/5 bg-white/[0.01] p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          Section Performance Breakdown
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {SECTION_KEYS.map((secKey) => {
            const sections = activeMetrics.sections as Record<string, { score: number; max: number }> | undefined;
            const sec = sections?.[secKey] ?? { score: 0, max: 1.0 };
            const pct = Math.round((sec.score / sec.max) * 100);

            return (
              <div key={secKey} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300 font-medium">
                    {SECTION_LABELS[secKey] || secKey}
                  </span>
                  <span className="font-bold text-white">
                    {sec.score} / {sec.max} ({pct}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                  <div className={portalProgressBarClass} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {criteriaList.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Field scores
          </p>
          <div className={portalCodeSurfaceClass}>
            <table className="w-full max-w-full table-fixed text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/15 bg-white/[0.03] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="p-3">Field</th>
                  {finalRuns.length > 1 ? (
                    finalRuns.map((run, idx) => (
                      <th key={run.runIndex} className="p-3 text-right">
                        Call {idx + 1}
                      </th>
                    ))
                  ) : (
                    <th className="p-3 text-right">Score</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200 font-medium">
                {criteriaList.map((crit) => (
                  <tr key={crit.key} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 text-slate-300">
                      <div className="font-bold flex items-center gap-1.5">
                        {crit.displayName}
                        {crit.critical && (
                          <span className="text-[9px] font-black uppercase bg-red-500/20 text-red-400 px-1 py-0.5 rounded border border-red-500/30">
                            CRITICAL
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {SECTION_LABELS[crit.section] || crit.section}
                      </div>
                    </td>
                    {finalRuns.length > 1 ? (
                      finalRuns.map((run) => (
                        <td key={run.runIndex} className="p-3 text-right text-white font-extrabold">
                          {getRunScore(finalRuns, run.runIndex, crit.key)}
                        </td>
                      ))
                    ) : (
                      <td className="p-3 text-right text-white font-extrabold">
                        {crit.score} / {crit.maxScore}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeMetrics.feedback && typeof activeMetrics.feedback === "object" ? (
        <div className="space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Qualitative Feedback
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Information Capture", key: "information_capture" },
              { label: "Timeliness & Dispatch", key: "timeliness" },
              { label: "Operational Understanding", key: "incident_understanding" },
            ].map(({ label, key }) => {
              const feedback = activeMetrics.feedback as Record<string, string>;
              return (
                <div
                  key={key}
                  className="rounded-lg border border-white/5 bg-white/[0.01] p-3"
                >
                  <p className="text-[10px] uppercase font-bold text-slate-500">{label}</p>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    {feedback[key]}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
