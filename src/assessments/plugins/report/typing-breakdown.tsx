"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  portalResultFailClass,
  portalResultPassClass,
} from "@/components/dashboard/portal/portal-design-tokens";
import {
  BreakdownMetricRow,
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
  StandardHeader,
  numberOrNull,
  roundOrDash,
} from "./breakdown-common";
import type { AssessmentReportBreakdownProps } from "./types";

type TypingWindow = {
  index: number;
  charactersTyped?: number;
  errors?: number;
  wpm?: number;
  errorRate?: number;
};

type TypingRun = {
  wpm?: number;
  accuracy?: number;
  stabilityScore?: number;
  correctionRatio?: number;
  correctCharacters?: number;
  typedCharacters?: number;
  mistakeCharacters?: number;
};

/**
 * Speed and error rate across the nine 10-second tracking windows the typing
 * specification defines. Consistency over the assessment is the point, so all
 * three passages share one pair of axes.
 */
function TypingWindowChart({
  series,
  dataKey,
  title,
  unit,
}: {
  series: Array<{ passageId?: string; windows?: TypingWindow[] }>;
  dataKey: "wpm" | "errorRate";
  title: string;
  unit: string;
}) {
  const windowCount = Math.max(0, ...series.map((entry) => entry.windows?.length ?? 0));
  if (windowCount === 0) return null;

  const config: ChartConfig = Object.fromEntries(
    series.map((_, index) => [
      `test${index + 1}`,
      { label: `Test ${index + 1}`, color: `hsl(var(--chart-${(index % 5) + 1}))` },
    ]),
  );

  const data = Array.from({ length: windowCount }, (_, windowIndex) => {
    const row: Record<string, number | string> = {
      window: `${windowIndex * 10}–${(windowIndex + 1) * 10}s`,
    };
    series.forEach((entry, index) => {
      const value = numberOrNull(entry.windows?.[windowIndex]?.[dataKey]);
      if (value !== null) row[`test${index + 1}`] = value;
    });
    return row;
  });

  return (
    <div className="space-y-2.5">
      <BreakdownSectionTitle>{`${title} (${unit})`}</BreakdownSectionTitle>
      <ChartContainer config={config} className="aspect-[16/6] w-full">
        <LineChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="window"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis tickLine={false} axisLine={false} width={32} tickMargin={4} />
          <ChartTooltip content={<ChartTooltipContent />} />
          {series.map((_, index) => (
            <Line
              key={`test${index + 1}`}
              dataKey={`test${index + 1}`}
              type="monotone"
              stroke={`var(--color-test${index + 1})`}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          ))}
        </LineChart>
      </ChartContainer>
    </div>
  );
}

export function TypingReportBreakdown({ result }: AssessmentReportBreakdownProps) {
  if (!result?.metrics) return null;
  const metrics = result.metrics;

  const runs = Array.isArray(metrics.passageEvidence)
    ? (metrics.passageEvidence as TypingRun[])
    : [];
  const windowSeries = Array.isArray(metrics.windowSeries)
    ? (metrics.windowSeries as Array<{ passageId?: string; windows?: TypingWindow[] }>)
    : [];

  return (
    <div className="space-y-5">
      <StandardHeader
        metrics={metrics}
        bandLabel={typeof metrics.ratingBand === "string" ? metrics.ratingBand : null}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <BreakdownStatTile label="Average speed" value={roundOrDash(metrics.wpm)} suffix="WPM" />
        <BreakdownStatTile
          label="Average accuracy"
          value={roundOrDash(metrics.accuracy)}
          suffix="%"
          valueClassName={portalResultPassClass}
        />
        <BreakdownStatTile
          label="Average mistakes"
          value={roundOrDash(metrics.averageMistakes)}
          valueClassName={portalResultFailClass}
        />
      </div>

      <BreakdownSection title="Typing stability — behaviour under sustained demand">
        <div className="grid gap-3 sm:grid-cols-3">
          <BreakdownStatTile
            label="Speed consistency · 40%"
            value={roundOrDash(metrics.speedConsistencyScore)}
          />
          <BreakdownStatTile
            label="Error distribution · 35%"
            value={roundOrDash(metrics.errorDistributionScore)}
          />
          <BreakdownStatTile
            label="Correction behaviour · 25%"
            value={roundOrDash(metrics.correctionBehaviourScore)}
          />
        </div>
        <BreakdownMetricRow
          label="Errors corrected"
          value={
            numberOrNull(metrics.totalErrors) === null
              ? "—"
              : `${metrics.correctedErrors} of ${metrics.totalErrors} (${roundOrDash(metrics.correctionRatio, "%")})`
          }
        />
      </BreakdownSection>

      {runs.length ? (
        <div className="space-y-2.5">
          <BreakdownSectionTitle>Detailed typing run performance</BreakdownSectionTitle>
          <BreakdownTableShell>
            <BreakdownTable>
              <BreakdownTableHead>
                <BreakdownTableHeaderRow>
                  <BreakdownTableHeaderCell>Run</BreakdownTableHeaderCell>
                  <BreakdownTableHeaderCell align="right">WPM</BreakdownTableHeaderCell>
                  <BreakdownTableHeaderCell align="right">Accuracy</BreakdownTableHeaderCell>
                  <BreakdownTableHeaderCell align="right">Mistakes</BreakdownTableHeaderCell>
                  <BreakdownTableHeaderCell align="right">Stability</BreakdownTableHeaderCell>
                  <BreakdownTableHeaderCell align="right">
                    Characters (Correct/Total)
                  </BreakdownTableHeaderCell>
                </BreakdownTableHeaderRow>
              </BreakdownTableHead>
              <BreakdownTableBody>
                {runs.map((run, index) => (
                  <BreakdownTableRow key={`typing-run-${index}`}>
                    <BreakdownTableCell className="font-semibold">
                      Run {index + 1}
                    </BreakdownTableCell>
                    <BreakdownTableCell align="right" className="font-bold">
                      {roundOrDash(run.wpm)}
                    </BreakdownTableCell>
                    <BreakdownTableCell
                      align="right"
                      className={`font-bold ${portalResultPassClass}`}
                    >
                      {roundOrDash(run.accuracy, "%")}
                    </BreakdownTableCell>
                    <BreakdownTableCell
                      align="right"
                      className={`font-bold ${portalResultFailClass}`}
                    >
                      {run.mistakeCharacters ?? 0}
                    </BreakdownTableCell>
                    <BreakdownTableCell align="right">
                      {roundOrDash(run.stabilityScore, "%")}
                    </BreakdownTableCell>
                    <BreakdownTableCell align="right" className="text-muted-foreground">
                      {run.correctCharacters ?? 0} / {run.typedCharacters ?? 0}
                    </BreakdownTableCell>
                  </BreakdownTableRow>
                ))}
              </BreakdownTableBody>
            </BreakdownTable>
          </BreakdownTableShell>
        </div>
      ) : null}

      {windowSeries.length ? (
        <>
          <TypingWindowChart
            series={windowSeries}
            dataKey="wpm"
            title="Typing speed across the assessment"
            unit="WPM per 10-second window"
          />
          <TypingWindowChart
            series={windowSeries}
            dataKey="errorRate"
            title="Error rate across the assessment"
            unit="% of characters typed"
          />
        </>
      ) : null}
    </div>
  );
}
