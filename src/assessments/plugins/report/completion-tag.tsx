import { Badge } from "@/components/ui/badge";
import { getAssessmentCompletionLabel } from "@/lib/assessment-completion-status";

function readCompletionProgress(metrics: Record<string, unknown>): string | null {
  const expected =
    typeof metrics.expectedQuestionCount === "number"
      ? metrics.expectedQuestionCount
      : typeof metrics.expectedRoundCount === "number"
        ? metrics.expectedRoundCount
        : null;
  const answered =
    typeof metrics.answeredQuestionCount === "number"
      ? metrics.answeredQuestionCount
      : typeof metrics.answeredRoundCount === "number"
        ? metrics.answeredRoundCount
        : null;

  if (expected === null || answered === null || answered >= expected) return null;
  return `${answered}/${expected}`;
}

export function AssessmentCompletionTag({
  metrics,
}: {
  metrics?: Record<string, unknown> | null;
}) {
  const label = getAssessmentCompletionLabel(metrics ?? null);
  if (!label) return null;

  const progress = metrics ? readCompletionProgress(metrics) : null;
  const displayLabel = progress ? `${label} · ${progress}` : label;

  const className =
    label === "Timeout"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
      : "border-slate-500/30 bg-slate-500/10 text-slate-300";

  return (
    <Badge variant="outline" className={className}>
      {displayLabel}
    </Badge>
  );
}
