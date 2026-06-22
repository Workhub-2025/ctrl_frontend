import {
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
import { getAverageTypingMistakes, getTypingRuns } from "./shared";

export function TypingReportBreakdown({ result }: AssessmentReportBreakdownProps) {
  if (!result) return null;

  const typingRuns = getTypingRuns(result.metrics);
  const averageMistakes = getAverageTypingMistakes(result.metrics, result.mistakeCount);

  return (
    <>
      {result.wpm !== null && result.wpm !== undefined && (
        <div className="grid gap-3 sm:grid-cols-3">
          <BreakdownStatTile label="Average Speed" value={result.wpm} suffix="WPM" />
          <BreakdownStatTile
            label="Average Accuracy"
            value={result.accuracy ?? "—"}
            suffix="%"
            valueClassName="text-emerald-600 dark:text-emerald-400"
          />
          <BreakdownStatTile
            label="Average Mistakes"
            value={averageMistakes ?? "—"}
            valueClassName="text-destructive"
          />
        </div>
      )}

      {typingRuns.length > 0 && (
        <div className="mt-3 space-y-2.5">
          <BreakdownSectionTitle>Detailed typing run performance</BreakdownSectionTitle>
          <BreakdownTableShell>
            <BreakdownTable>
              <BreakdownTableHead>
                <BreakdownTableHeaderRow>
                  <BreakdownTableHeaderCell>Run</BreakdownTableHeaderCell>
                  <BreakdownTableHeaderCell align="right">WPM</BreakdownTableHeaderCell>
                  <BreakdownTableHeaderCell align="right">Accuracy</BreakdownTableHeaderCell>
                  <BreakdownTableHeaderCell align="right">Mistakes</BreakdownTableHeaderCell>
                  <BreakdownTableHeaderCell align="right">Characters (Correct/Total)</BreakdownTableHeaderCell>
                </BreakdownTableHeaderRow>
              </BreakdownTableHead>
              <BreakdownTableBody>
                {typingRuns.map((run, index) => (
                  <BreakdownTableRow key={`typing-run-${run.runIndex ?? index}`}>
                    <BreakdownTableCell className="font-semibold">
                      Run {run.runIndex ?? index + 1}
                    </BreakdownTableCell>
                    <BreakdownTableCell align="right" className="font-bold">
                      {run.wpm ?? "—"}
                    </BreakdownTableCell>
                    <BreakdownTableCell
                      align="right"
                      className="font-bold text-emerald-600 dark:text-emerald-400"
                    >
                      {run.accuracy ?? "—"}%
                    </BreakdownTableCell>
                    <BreakdownTableCell align="right" className="font-bold text-destructive">
                      {run.mistakeCharacters ?? "0"}
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
      )}
    </>
  );
}
