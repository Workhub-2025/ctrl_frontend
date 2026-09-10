"use client";
import { ScoringTable } from "./scoring-table";

import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  portalResultBarMutedClass,
  portalResultBarPassClass,
  portalResultBarSecondaryClass,
  portalResultFailClass,
  portalResultMutedClass,
  portalResultPassClass,
  portalResultSecondaryClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
import {
  BreakdownMetricRow,
  BreakdownProgressTrack,
  BreakdownSection,
  BreakdownSectionTitle,
  BreakdownStatTile,
} from "./breakdown-ui";
import {
  CriticalGates,
  StandardHeader,
  asFlags,
  formatDuration,
  numberOrNull,
} from "./breakdown-common";
import { PerformanceInsights } from "./performance-insights";
import type { AssessmentReportBreakdownProps } from "./types";

type QuestionScore = {
  questionId: string;
  displayedPoints: number;
  maximumPoints: number;
};

export function PrioritisationReportBreakdown({
  result,
}: AssessmentReportBreakdownProps) {
  if (!result?.metrics) return null;
  const metrics = result.metrics;

  const bandAccuracy = metrics.bandAccuracy as
    | { high?: number; medium?: number; low?: number }
    | undefined;
  const questionScores = Array.isArray(metrics.questionScores)
    ? (metrics.questionScores as QuestionScore[])
    : [];
  const lowest = Array.isArray(metrics.lowestPerformingQuestions)
    ? (metrics.lowestPerformingQuestions as QuestionScore[])
    : [];
  const criticalCount = numberOrNull(metrics.criticalMisprioritisationCount);

  const bands = [
    {
      label: "High priority",
      score: numberOrNull(bandAccuracy?.high ?? metrics.highPriorityAccuracy),
      barClass: portalResultBarPassClass,
      valueClass: portalResultPassClass,
    },
    {
      label: "Medium priority",
      score: numberOrNull(bandAccuracy?.medium ?? metrics.mediumPriorityAccuracy),
      barClass: portalResultBarSecondaryClass,
      valueClass: portalResultSecondaryClass,
    },
    {
      label: "Low priority",
      score: numberOrNull(bandAccuracy?.low ?? metrics.lowPriorityAccuracy),
      barClass: portalResultBarMutedClass,
      valueClass: portalResultMutedClass,
    },
  ];

  const chartConfig: ChartConfig = {
    displayedPoints: { label: "Question score", color: "hsl(var(--chart-1))" },
  };

  return (
    <div className="space-y-5">
      <StandardHeader
        metrics={metrics}
        bandLabel={typeof metrics.outcomeBand === "string" ? metrics.outcomeBand : null}
      />

      <PerformanceInsights insights={metrics.insights} />

      <BreakdownSection title="Priority band accuracy">
        <div className="space-y-3">
          {bands.map((band) => (
            <div key={band.label} className="space-y-1.5">
              <BreakdownMetricRow
                label={band.label}
                value={band.score === null ? "—" : `${Math.round(band.score)}%`}
                valueClassName={band.valueClass}
              />
              {band.score !== null && <BreakdownProgressTrack value={band.score} className={band.barClass} />}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          High-priority accuracy is the safety-critical indicator: it shows whether
          the candidate recognises incidents needing immediate attention. The minimum
          standard is 70%.
        </p>
      </BreakdownSection>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <BreakdownStatTile
          label="Total score"
          value={
            numberOrNull(metrics.rawPoints) === null
              ? "—"
              : `${metrics.rawPoints} / ${metrics.maximumPoints}`
          }
          valueClassName="text-lg"
        />
        <BreakdownStatTile
          label="Critical misprioritisations"
          value={criticalCount ?? "—"}
          valueClassName={cn(
            "text-lg",
            criticalCount !== null && criticalCount > 0 ? portalResultFailClass : undefined,
          )}
        />
        <BreakdownStatTile
          label="Average question score"
          value={
            numberOrNull(metrics.averageQuestionScore) === null
              ? "—"
              : `${metrics.averageQuestionScore} / 12`
          }
          valueClassName="text-lg"
        />
        <BreakdownStatTile
          label="Completion time"
          value={formatDuration(metrics.completionTimeSeconds)}
          valueClassName="text-lg"
        />
      </div>

      {questionScores.length ? (
        <div className="space-y-2.5">
          <BreakdownSectionTitle>
            Consistency across questions (score out of 12)
          </BreakdownSectionTitle>
          <ChartContainer config={chartConfig} className="aspect-[16/6] w-full">
            <LineChart
              data={questionScores.map((question, index) => ({
                question: `Q${index + 1}`,
                displayedPoints: question.displayedPoints,
              }))}
              margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="question"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 12]}
                tickLine={false}
                axisLine={false}
                width={24}
                tickMargin={4}
              />
              {numberOrNull(metrics.averageQuestionScore) !== null ? (
                <ReferenceLine
                  y={Number(metrics.averageQuestionScore)}
                  strokeDasharray="4 4"
                  stroke="currentColor"
                  className="text-muted-foreground"
                />
              ) : null}
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="displayedPoints"
                type="monotone"
                stroke="var(--color-displayedPoints)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </div>
      ) : null}

      <ScoringTable title="Question scoring records" columns={["Question", "Points", "Maximum"]} rows={questionScores.map(question => [question.questionId, question.displayedPoints, question.maximumPoints])} />
      <BreakdownSection title="Direction of critical misprioritisations">
        <BreakdownMetricRow label="High-priority incidents placed low" value={numberOrNull(metrics.highPlacedLowCount) ?? "—"} />
        <BreakdownMetricRow label="Low-priority incidents placed high" value={numberOrNull(metrics.lowPlacedHighCount) ?? "—"} />
      </BreakdownSection>
      {lowest.length ? (
        <BreakdownSection title="Lowest performing questions">
          <div className="space-y-2">
            {lowest.map((question) => (
              <BreakdownMetricRow
                key={question.questionId}
                label={question.questionId}
                value={`${question.displayedPoints} / ${question.maximumPoints}`}
                valueClassName={
                  question.displayedPoints < question.maximumPoints / 2
                    ? portalResultFailClass
                    : undefined
                }
              />
            ))}
          </div>
        </BreakdownSection>
      ) : null}

      <CriticalGates flags={asFlags(metrics.criticalFlags)} />
    </div>
  );
}
