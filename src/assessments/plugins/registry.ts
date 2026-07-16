import { CallSimulationReportBreakdown } from "./report/call-simulation-breakdown";
import { hasCallSimulationReportBreakdown } from "./report/shared";
import { CANDIDATE_ASSESSMENT_CATALOG } from "./candidate-catalog";

const catalog = CANDIDATE_ASSESSMENT_CATALOG.find((item) => item.slug === "call-simulation");
if (!catalog) {
  throw new Error("Call Simulation UI plugin metadata is missing from the assessment catalogue");
}
const plugin = {
  ...catalog,
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
  return CANDIDATE_ASSESSMENT_CATALOG.map((item) => item.slug);
}

export function getTimedAssessmentSlugs(): Set<string> {
  return new Set(CANDIDATE_ASSESSMENT_CATALOG.map((item) => item.slug));
}

export { candidateAssessmentItems, completionLabels } from "./candidate-catalog";
