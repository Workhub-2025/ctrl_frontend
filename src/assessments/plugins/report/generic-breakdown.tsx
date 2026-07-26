"use client";

import { portalProgressBarClass } from "@/components/dashboard/portal/portal-design-tokens";
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

type Competency = { id: string; label: string; weight: number; score: number };
type CriticalFlag = { id: string; scenarioId: string; label: string };

function asCompetencies(value: unknown): Competency[] {
  return Array.isArray(value) ? (value as Competency[]) : [];
}

function asFlags(value: unknown): CriticalFlag[] {
  return Array.isArray(value) ? (value as CriticalFlag[]) : [];
}

function CompetencyBars({ competencies }: { competencies: Competency[] }) {
  if (!competencies.length) return null;
  return (
    <BreakdownSection title="Weighted competencies">
      <div className="space-y-4">
        {competencies.map((competency) => (
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
  );
}

function CriticalGates({ flags }: { flags: CriticalFlag[] }) {
  return (
    <BreakdownSection title="Critical / risk flags">
      {flags.length ? (
        <ul className="space-y-2">
          {flags.map((flag) => (
            <li
              key={`${flag.scenarioId}-${flag.id}`}
              className="border-l-4 border-destructive bg-destructive/10 p-3 text-sm text-foreground"
            >
              <strong>{flag.scenarioId}:</strong> {flag.label}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No critical flags recorded.</p>
      )}
    </BreakdownSection>
  );
}

function StandardHeader({ metrics }: { metrics: Record<string, unknown> }) {
  const overallScore = Number(metrics.overallScore ?? 0);
  const threshold = Number(metrics.configuredThreshold ?? 70);
  const meetsStandard = metrics.meetsConfiguredStandard === true;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <BreakdownStatTile label="Overall score" value={Math.round(overallScore)} suffix="%" />
      <BreakdownStatTile label="Configured standard" value={threshold} suffix="%" />
      <BreakdownStatTile
        label="Assessment standard"
        value={meetsStandard ? "MET" : "NOT MET"}
        valueClassName={meetsStandard ? "text-primary" : "text-destructive"}
      />
    </div>
  );
}

export function TypingReportBreakdown({ result }: AssessmentReportBreakdownProps) {
  if (!result?.metrics) return null;
  const metrics = result.metrics;
  const passages = Array.isArray(metrics.passageEvidence)
    ? (metrics.passageEvidence as Array<{
        wpm?: number;
        accuracy?: number;
        speedScore?: number;
        accuracyScore?: number;
        stabilityScore?: number;
      }>)
    : [];
  const competencies = asCompetencies(metrics.competencyScores);

  return (
    <div className="space-y-5">
      <StandardHeader metrics={metrics} />
      <div className="grid gap-3 sm:grid-cols-3">
        <BreakdownStatTile
          label="Speed"
          value={metrics.wpm != null ? Math.round(Number(metrics.wpm)) : "—"}
          suffix="WPM"
        />
        <BreakdownStatTile
          label="Accuracy"
          value={
            metrics.accuracy != null ? Math.round(Number(metrics.accuracy)) : "—"
          }
          suffix="%"
        />
        <BreakdownStatTile
          label="Passages"
          value={passages.length || "—"}
        />
      </div>
      <CompetencyBars competencies={competencies} />
      {passages.length ? (
        <div className="space-y-2.5">
          <BreakdownSectionTitle>Passage evidence</BreakdownSectionTitle>
          <BreakdownTableShell>
            <BreakdownTable>
              <BreakdownTableHead>
                <BreakdownTableHeaderRow>
                  <BreakdownTableHeaderCell>Passage</BreakdownTableHeaderCell>
                  <BreakdownTableHeaderCell align="right">WPM</BreakdownTableHeaderCell>
                  <BreakdownTableHeaderCell align="right">Accuracy</BreakdownTableHeaderCell>
                  <BreakdownTableHeaderCell align="right">Stability</BreakdownTableHeaderCell>
                </BreakdownTableHeaderRow>
              </BreakdownTableHead>
              <BreakdownTableBody>
                {passages.map((passage, index) => (
                  <BreakdownTableRow key={`passage-${index}`}>
                    <BreakdownTableCell>Test {index + 1}</BreakdownTableCell>
                    <BreakdownTableCell align="right">
                      {passage.wpm != null ? Math.round(passage.wpm) : "—"}
                    </BreakdownTableCell>
                    <BreakdownTableCell align="right">
                      {passage.accuracy != null
                        ? `${Math.round(passage.accuracy)}%`
                        : "—"}
                    </BreakdownTableCell>
                    <BreakdownTableCell align="right">
                      {passage.stabilityScore != null
                        ? `${Math.round(passage.stabilityScore)}%`
                        : "—"}
                    </BreakdownTableCell>
                  </BreakdownTableRow>
                ))}
              </BreakdownTableBody>
            </BreakdownTable>
          </BreakdownTableShell>
        </div>
      ) : null}
    </div>
  );
}

export function SituationalJudgementReportBreakdown({
  result,
}: AssessmentReportBreakdownProps) {
  if (!result?.metrics) return null;
  const metrics = result.metrics;
  return (
    <div className="space-y-5">
      <StandardHeader metrics={metrics} />
      <CompetencyBars competencies={asCompetencies(metrics.competencyScores)} />
      <CriticalGates flags={asFlags(metrics.criticalFlags)} />
    </div>
  );
}

export function PrioritisationReportBreakdown({
  result,
}: AssessmentReportBreakdownProps) {
  if (!result?.metrics) return null;
  const metrics = result.metrics;
  const bandAccuracy = metrics.bandAccuracy as
    | { high?: number; medium?: number; low?: number }
    | undefined;
  return (
    <div className="space-y-5">
      <StandardHeader metrics={metrics} />
      {bandAccuracy ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <BreakdownStatTile
            label="High priority"
            value={Math.round(Number(bandAccuracy.high ?? metrics.highPriorityAccuracy ?? 0))}
            suffix="%"
          />
          <BreakdownStatTile
            label="Medium priority"
            value={Math.round(Number(bandAccuracy.medium ?? metrics.mediumPriorityAccuracy ?? 0))}
            suffix="%"
          />
          <BreakdownStatTile
            label="Low priority"
            value={Math.round(Number(bandAccuracy.low ?? metrics.lowPriorityAccuracy ?? 0))}
            suffix="%"
          />
        </div>
      ) : null}
      <CompetencyBars competencies={asCompetencies(metrics.competencyScores)} />
      <CriticalGates flags={asFlags(metrics.criticalFlags)} />
    </div>
  );
}

export function ShortTermMemoryReportBreakdown({
  result,
}: AssessmentReportBreakdownProps) {
  if (!result?.metrics) return null;
  const metrics = result.metrics;
  const evidence = Array.isArray(metrics.scenarioEvidence)
    ? (metrics.scenarioEvidence[0] as {
        recall?: unknown;
        sequenceScore?: number;
        correctionScore?: number;
        interruptionScore?: number;
      } | undefined)
    : undefined;
  return (
    <div className="space-y-5">
      <StandardHeader metrics={metrics} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BreakdownStatTile
          label="Recall"
          value={
            metrics.factRecallAccuracy != null
              ? Math.round(Number(metrics.factRecallAccuracy))
              : "—"
          }
          suffix="%"
        />
        <BreakdownStatTile
          label="Sequence"
          value={
            evidence?.sequenceScore != null
              ? Math.round(evidence.sequenceScore)
              : "—"
          }
          suffix="%"
        />
        <BreakdownStatTile
          label="Correction"
          value={
            evidence?.correctionScore != null
              ? Math.round(evidence.correctionScore)
              : "—"
          }
          suffix="%"
        />
        <BreakdownStatTile
          label="Interruption"
          value={
            evidence?.interruptionScore != null
              ? Math.round(evidence.interruptionScore)
              : "—"
          }
          suffix="%"
        />
      </div>
      <CompetencyBars competencies={asCompetencies(metrics.competencyScores)} />
      <CriticalGates flags={asFlags(metrics.criticalFlags)} />
    </div>
  );
}

export function hasGenericReportBreakdown(
  result: AssessmentReportBreakdownProps["result"],
): boolean {
  return Boolean(result?.metrics && result.numericScore !== null);
}
