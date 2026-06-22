"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { portalBadgeClass, portalProgressBarClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import type { HiringManagerAssessmentResult } from "@/services/hiring-manager-portal-client.service";
import {
  BreakdownMetricRow,
  BreakdownProgressTrack,
  BreakdownSection,
  BreakdownSectionTitle,
  BreakdownStatTile,
  BreakdownTable,
  BreakdownTableBody,
  BreakdownTableCell,
  BreakdownTableHead,
  BreakdownTableHeaderCell,
  BreakdownTableHeaderRow,
  BreakdownTableRow,
  BreakdownTableShell,
} from "./breakdown-ui";
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
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/50 pb-3 dark:border-white/10">
          <span className="mr-2 text-xs font-semibold text-muted-foreground">Select call</span>
          {finalRuns.map((run, idx) => {
            const runMetrics = run.metrics as Record<string, unknown> | undefined;
            const isSelected = activeRunIndex === run.runIndex;
            return (
              <Button
                key={run.runIndex}
                type="button"
                variant={isSelected ? "default" : "outline"}
                onClick={() => setSelectedCallRunIndex(run.runIndex)}
                className="h-7 rounded-lg px-3 text-[11px] font-semibold"
              >
                Call {idx + 1} {runMetrics?.passed ? " (Pass)" : " (Review)"}
              </Button>
            );
          })}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <BreakdownStatTile
          label="Scoring Outcome"
          value={activeMetrics.passed ? "PASSED" : "FAILED"}
          valueClassName={
            activeMetrics.passed
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-destructive"
          }
        />
        <BreakdownStatTile
          label="Critical Errors"
          value={(activeMetrics.criticalErrorsCount as number) ?? 0}
          valueClassName={
            ((activeMetrics.criticalErrorsCount as number) ?? 0) > 0
              ? "text-destructive"
              : undefined
          }
        />
        <BreakdownStatTile
          label="Marks Awarded"
          value={(activeMetrics.totalEarnedScore as string | number) ?? "0"}
          suffix={`/ ${(activeMetrics.maxScore as string | number) ?? "5.0"}`}
        />
      </div>

      <BreakdownSection title="Section performance breakdown">
        <div className="grid gap-4 sm:grid-cols-2">
          {SECTION_KEYS.map((secKey) => {
            const sections = activeMetrics.sections as Record<string, { score: number; max: number }> | undefined;
            const sec = sections?.[secKey] ?? { score: 0, max: 1.0 };
            const pct = Math.round((sec.score / sec.max) * 100);

            return (
              <div key={secKey} className="space-y-1.5">
                <BreakdownMetricRow
                  label={SECTION_LABELS[secKey] || secKey}
                  value={`${sec.score} / ${sec.max} (${pct}%)`}
                />
                <BreakdownProgressTrack value={pct} className={portalProgressBarClass} />
              </div>
            );
          })}
        </div>
      </BreakdownSection>

      {criteriaList.length > 0 && (
        <div className="space-y-2.5">
          <BreakdownSectionTitle>Field scores</BreakdownSectionTitle>
          <BreakdownTableShell>
            <BreakdownTable>
              <BreakdownTableHead>
                <BreakdownTableHeaderRow>
                  <BreakdownTableHeaderCell>Field</BreakdownTableHeaderCell>
                  {finalRuns.length > 1 ? (
                    finalRuns.map((run, idx) => (
                      <BreakdownTableHeaderCell key={run.runIndex} align="right">
                        Call {idx + 1}
                      </BreakdownTableHeaderCell>
                    ))
                  ) : (
                    <BreakdownTableHeaderCell align="right">Score</BreakdownTableHeaderCell>
                  )}
                </BreakdownTableHeaderRow>
              </BreakdownTableHead>
              <BreakdownTableBody>
                {criteriaList.map((crit) => (
                  <BreakdownTableRow key={crit.key}>
                    <BreakdownTableCell>
                      <div className="flex items-center gap-1.5 font-semibold">
                        {crit.displayName}
                        {crit.critical ? (
                          <span className={cn(portalBadgeClass, "text-[9px] font-bold uppercase text-destructive")}>
                            Critical
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {SECTION_LABELS[crit.section] || crit.section}
                      </div>
                    </BreakdownTableCell>
                    {finalRuns.length > 1 ? (
                      finalRuns.map((run) => (
                        <BreakdownTableCell key={run.runIndex} align="right" className="font-bold">
                          {getRunScore(finalRuns, run.runIndex, crit.key)}
                        </BreakdownTableCell>
                      ))
                    ) : (
                      <BreakdownTableCell align="right" className="font-bold">
                        {crit.score} / {crit.maxScore}
                      </BreakdownTableCell>
                    )}
                  </BreakdownTableRow>
                ))}
              </BreakdownTableBody>
            </BreakdownTable>
          </BreakdownTableShell>
        </div>
      )}

      {activeMetrics.feedback && typeof activeMetrics.feedback === "object" ? (
        <div className="space-y-2.5">
          <BreakdownSectionTitle>Qualitative feedback</BreakdownSectionTitle>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Information Capture", key: "information_capture" },
              { label: "Timeliness & Dispatch", key: "timeliness" },
              { label: "Operational Understanding", key: "incident_understanding" },
            ].map(({ label, key }) => {
              const feedback = activeMetrics.feedback as Record<string, string>;
              return (
                <BreakdownSection key={key} className="p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-foreground">{feedback[key]}</p>
                </BreakdownSection>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
