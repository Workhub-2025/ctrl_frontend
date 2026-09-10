"use client";
import { PerformanceInsights } from "./performance-insights";
import { ScoringTable } from "./scoring-table";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  portalBadgeClass,
  portalProgressBarClass,
  portalResultFailClass,
  portalResultPassClass,
  portalResultWarnClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
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
import {
  CriticalGates,
  StandardHeader,
  asCompetencies,
  asFlags,
  numberOrNull,
} from "./breakdown-common";
import type { AssessmentReportBreakdownProps } from "./types";

const SECTION_LABELS: Record<string, string> = {
  caller: "Caller information",
  system: "System information",
  intelligence: "Intelligence information",
  incident: "Incident information",
};

const SECTION_ORDER = ["caller", "system", "intelligence", "incident"];

type CriterionEvidence = {
  criterionId: string;
  explanation?: string;
  label?: string;
  section?: string;
  critical?: boolean;
  maxScore?: number;
  matched?: boolean;
  awarded?: number;
  timingBand?: "green" | "amber" | "red";
  delaySeconds?: number | null;
};

type ScenarioEvidence = {
  scenarioId: string;
  points?: number;
  maximum?: number;
  sections?: Record<string, { score: number; max: number }>;
  criteria?: CriterionEvidence[];
  elapsedSeconds?: number | null;
};

function timingBandClass(band: string | undefined) {
  if (band === "green") return portalResultPassClass;
  if (band === "amber") return portalResultWarnClass;
  if (band === "red") return portalResultFailClass;
  return "text-muted-foreground";
}

function timingBandSummary(criteria: CriterionEvidence[] | undefined) {
  return (criteria ?? []).reduce(
    (totals, criterion) => {
      if (criterion.timingBand === "green") totals.green += 1;
      else if (criterion.timingBand === "amber") totals.amber += 1;
      else if (criterion.timingBand === "red") totals.red += 1;
      return totals;
    },
    { green: 0, amber: 0, red: 0 },
  );
}

export function CallSimulationReportBreakdown({
  result,
}: AssessmentReportBreakdownProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);

  if (!result?.metrics) return null;
  const metrics = result.metrics;

  const scenarios = Array.isArray(metrics.scenarioEvidence)
    ? (metrics.scenarioEvidence as ScenarioEvidence[])
    : [];
  const active =
    scenarios.find((scenario) => scenario.scenarioId === selectedScenarioId) ??
    scenarios[0] ??
    null;
  const bands = timingBandSummary(active?.criteria);
  const passed = typeof metrics.passed === "boolean" ? metrics.passed : null;
  const criticalErrors = numberOrNull(metrics.criticalErrorsCount);

  const orderedSections = SECTION_ORDER.filter(
    (section) => active?.sections?.[section] !== undefined,
  );

  return (
    <div className="space-y-5">
      <div className="border-l-4 border-primary bg-muted p-4 text-sm leading-6 text-foreground">
        This report contains evidence from a high-fidelity operational simulation.
        It is not a validated psychometric instrument or an automated hiring decision.
      </div>

      <StandardHeader metrics={metrics} />
      <PerformanceInsights insights={metrics.insights} />

      {scenarios.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/50 pb-3 dark:border-white/10">
          <span className="mr-2 text-xs font-semibold text-muted-foreground">
            Select call
          </span>
          {scenarios.map((scenario, index) => {
            const isSelected = active?.scenarioId === scenario.scenarioId;
            return (
              <Button
                key={scenario.scenarioId}
                type="button"
                variant={isSelected ? "default" : "outline"}
                onClick={() => setSelectedScenarioId(scenario.scenarioId)}
                className="min-h-11 rounded-lg px-3 text-xs font-semibold"
              >
                Call {index + 1}
              </Button>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <BreakdownStatTile
          label="Scoring outcome"
          value={passed === null ? "Unavailable" : passed ? "STANDARD MET" : "STANDARD NOT MET"}
          valueClassName={cn(
            "text-lg",
            passed ? portalResultPassClass : portalResultFailClass,
          )}
        />
        <BreakdownStatTile
          label="Critical errors"
          value={criticalErrors ?? "—"}
          valueClassName={cn(
            "text-lg",
            criticalErrors !== null && criticalErrors > 0 ? portalResultFailClass : undefined,
          )}
        />
        <BreakdownStatTile
          label="Marks awarded"
          value={numberOrNull(metrics.totalEarnedScore) ?? "—"}
          suffix={`/ ${numberOrNull(metrics.maxScore) ?? "—"}`}
        />
      </div>

      <ScoringTable title="All assessed calls" columns={["Call", "Marks", "Maximum"]} rows={scenarios.map((scenario,index) => [`Call ${index + 1}`, scenario.points, scenario.maximum])} />
      {orderedSections.length ? (
        <BreakdownSection title="Section performance breakdown">
          <div className="grid gap-4 sm:grid-cols-2">
            {orderedSections.map((section) => {
              const entry = active!.sections![section]!;
              const percent =
                entry.max > 0 ? Math.round((entry.score / entry.max) * 100) : 0;
              return (
                <div key={section} className="space-y-1.5">
                  <BreakdownMetricRow
                    label={SECTION_LABELS[section] ?? section}
                    value={`${entry.score} / ${entry.max} (${percent}%)`}
                  />
                  <BreakdownProgressTrack value={percent} className={portalProgressBarClass} />
                </div>
              );
            })}
          </div>
        </BreakdownSection>
      ) : null}

      <BreakdownSection title="Response timing">
        <p className="text-sm text-muted-foreground">
          <span className={timingBandClass("green")}>{bands.green} on time</span>
          {" · "}
          <span className={timingBandClass("amber")}>{bands.amber} delayed</span>
          {" · "}
          <span className={timingBandClass("red")}>{bands.red} late</span>
          {" — captured against the point each detail was first spoken."}
        </p>
      </BreakdownSection>

      {active?.criteria?.length ? (
        <div className="space-y-2.5">
          <BreakdownSectionTitle>Field scores</BreakdownSectionTitle>
          <BreakdownTableShell>
            <BreakdownTable>
              <BreakdownTableHead>
                <BreakdownTableHeaderRow>
                  <BreakdownTableHeaderCell>Field</BreakdownTableHeaderCell>
                  <BreakdownTableHeaderCell align="right">Timing</BreakdownTableHeaderCell>
                  <BreakdownTableHeaderCell align="right">Score</BreakdownTableHeaderCell>
                </BreakdownTableHeaderRow>
              </BreakdownTableHead>
              <BreakdownTableBody>
                {active.criteria.map((criterion) => (
                  <BreakdownTableRow key={criterion.criterionId}>
                    <BreakdownTableCell>
                      <div className="flex items-center gap-1.5 font-semibold">
                        {criterion.label ?? criterion.criterionId}
                        {criterion.critical ? (
                          <span
                            className={cn(
                              portalBadgeClass,
                              "text-[9px] font-bold uppercase",
                              portalResultFailClass,
                            )}
                          >
                            Critical
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-foreground">
                        {SECTION_LABELS[criterion.section ?? ""] ?? criterion.section}
                      </div>
                      {criterion.explanation && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{criterion.explanation}</p>}
                    </BreakdownTableCell>
                    <BreakdownTableCell
                      align="right"
                      className={timingBandClass(criterion.timingBand)}
                    >
                      {criterion.timingBand ?? "—"}
                    </BreakdownTableCell>
                    <BreakdownTableCell align="right" className="font-bold">
                      {criterion.awarded ?? "—"} / {criterion.maxScore ?? "—"}
                    </BreakdownTableCell>
                  </BreakdownTableRow>
                ))}
              </BreakdownTableBody>
            </BreakdownTable>
          </BreakdownTableShell>
        </div>
      ) : null}

      <BreakdownSection title="Weighted competencies">
        <div className="space-y-4">
          {asCompetencies(metrics.competencyScores).map((competency) => (
            <div key={competency.id}>
              <BreakdownMetricRow
                label={`${competency.label} · ${competency.weight}% weight`}
                value={`${Math.round(competency.score)}%`}
              />
              <BreakdownProgressTrack
                value={competency.score}
                className={portalProgressBarClass}
              />
            </div>
          ))}
        </div>
      </BreakdownSection>

      <CriticalGates flags={asFlags(metrics.criticalFlags)} />

      <BreakdownSection title="Integrity events — separate from performance scoring">
        <p className="text-sm text-muted-foreground">
          {result.integrityEventCount ?? "Unavailable"} monitored event(s) recorded. Integrity
          events are reviewed separately and do not alter the performance score.
        </p>
      </BreakdownSection>
    </div>
  );
}
