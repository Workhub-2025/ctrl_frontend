import { Phone } from "lucide-react";
import { CallSimulationReportBreakdown } from "./report/call-simulation-breakdown";
import { hasCallSimulationReportBreakdown } from "./report/shared";
import { CANDIDATE_ASSESSMENT_CATALOG } from "./candidate-catalog";

const catalog = CANDIDATE_ASSESSMENT_CATALOG[0];
const plugin = {
  ...catalog,
  icon: Phone,
  reportBreakdown: CallSimulationReportBreakdown,
  hasReportBreakdown: hasCallSimulationReportBreakdown,
};

export function getAssessmentUiPlugin(slug: string) {
  return slug === plugin.slug ? plugin : undefined;
}

export function getAssessmentPluginTitle(slug: string): string | undefined {
  return getAssessmentUiPlugin(slug)?.title;
}

export function getAssessmentPluginIcon(slug: string) {
  return getAssessmentUiPlugin(slug)?.icon;
}

export function listAssessmentUiPlugins() {
  return [plugin];
}

export function listAssessmentSlugs(): string[] {
  return [plugin.slug];
}

export function getTimedAssessmentSlugs(): Set<string> {
  return new Set([plugin.slug]);
}

export { candidateAssessmentItems, completionLabels } from "./candidate-catalog";
