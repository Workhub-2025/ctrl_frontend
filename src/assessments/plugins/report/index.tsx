import { getAssessmentUiPlugin } from "../registry";
import type { AssessmentReportBreakdownProps } from "./types";

type AssessmentReportBreakdownComponentProps = AssessmentReportBreakdownProps & {
  slug: string;
};

export function AssessmentReportBreakdown({ slug, result }: AssessmentReportBreakdownComponentProps) {
  const plugin = getAssessmentUiPlugin(slug);
  const Breakdown = plugin?.reportBreakdown;
  if (!Breakdown) return null;
  return <Breakdown result={result} />;
}

export function hasAssessmentReportBreakdown(
  slug: string,
  result: AssessmentReportBreakdownProps["result"]
): boolean {
  const plugin = getAssessmentUiPlugin(slug);
  return plugin?.hasReportBreakdown?.(result) ?? false;
}
