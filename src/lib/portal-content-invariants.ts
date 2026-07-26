import type { ScreenDTO } from "@/lib/portal-contracts";

export type ScreenContentIssue = Readonly<{
  kind: "duplicate-metric" | "duplicate-action";
  key: string;
}>;

export function inspectScreenContent(screen: ScreenDTO<object>): ScreenContentIssue[] {
  const issues: ScreenContentIssue[] = [];
  const metricKeys = new Set<string>();

  for (const metric of screen.metrics ?? []) {
    if (metricKeys.has(metric.key)) {
      issues.push({ kind: "duplicate-metric", key: metric.key });
    }
    metricKeys.add(metric.key);
  }

  if (
    screen.primaryAction &&
    (screen.decisions ?? []).some(
      (decision) => decision.actionLabel === screen.primaryAction?.label,
    )
  ) {
    issues.push({
      kind: "duplicate-action",
      key: screen.primaryAction.key,
    });
  }

  return issues;
}

export function assertScreenContent(screen: ScreenDTO<object>): void {
  const issues = inspectScreenContent(screen);
  if (issues.length > 0) {
    throw new Error(
      `Screen "${screen.routeId}" violates content ownership: ${issues
        .map((issue) => `${issue.kind}:${issue.key}`)
        .join(", ")}`,
    );
  }
}
