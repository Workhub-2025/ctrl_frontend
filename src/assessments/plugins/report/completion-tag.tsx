import { Badge } from "@/components/ui/badge";
import { portalBadgeClass } from "@/components/dashboard/portal/portal-design-tokens";
import { cn } from "@/lib/utils";
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

  return (
    <Badge
      variant="outline"
      className={cn(
        portalBadgeClass,
        label === "Timeout" && "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      )}
    >
      {displayLabel}
    </Badge>
  );
}
