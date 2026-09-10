import { CallSimulationReportBreakdown } from "./report/call-simulation-breakdown";
import { PrioritisationReportBreakdown } from "./report/prioritisation-breakdown";
import { ShortTermMemoryReportBreakdown } from "./report/short-term-memory-breakdown";
import { SituationalJudgementReportBreakdown } from "./report/situational-judgement-breakdown";
import { TypingReportBreakdown } from "./report/typing-breakdown";
import {
  hasCallSimulationReportBreakdown,
  hasPrioritisationReportBreakdown,
  hasShortTermMemoryReportBreakdown,
  hasSituationalJudgementReportBreakdown,
  hasTypingReportBreakdown,
} from "./report/shared";
import { CANDIDATE_ASSESSMENT_CATALOG } from "./candidate-catalog";
import type { AssessmentReportUiPlugin } from "./types";

function requireCatalog(slug: string) {
  const catalog = CANDIDATE_ASSESSMENT_CATALOG.find((item) => item.slug === slug);
  if (!catalog) {
    throw new Error(`Assessment UI plugin metadata missing for ${slug}`);
  }
  return catalog;
}

const plugins: AssessmentReportUiPlugin[] = [
  {
    ...requireCatalog("typing"),
    headlineMetrics: [{key:"wpm",label:"Average speed",suffix:" WPM"}, {key:"accuracy",label:"Accuracy",suffix:"%"}, {key:"stabilityScore",label:"Stability",suffix:"/100"}],
    reportBreakdown: TypingReportBreakdown,
    hasReportBreakdown: hasTypingReportBreakdown,
  },
  {
    ...requireCatalog("situational-judgement"),
    headlineMetrics: [{key:"decisionBand",label:"Decision band"}, {key:"competencyBelowFloorCount",label:"Below minimum"}, {key:"criticalFlagCount",label:"Risk flags"}],
    reportBreakdown: SituationalJudgementReportBreakdown,
    hasReportBreakdown: hasSituationalJudgementReportBreakdown,
  },
  {
    ...requireCatalog("prioritisation"),
    headlineMetrics: [{key:"highPriorityAccuracy",label:"High-priority accuracy",suffix:"%"}, {key:"criticalMisprioritisationCount",label:"Critical misprioritisations"}, {key:"rawPoints",label:"Points",maximumKey:"maximumPoints"}],
    reportBreakdown: PrioritisationReportBreakdown,
    hasReportBreakdown: hasPrioritisationReportBreakdown,
  },
  {
    ...requireCatalog("short-term-memory"),
    headlineMetrics: [{key:"factRecallAccuracy",label:"Recall accuracy",suffix:"%"}, {key:"criticalFactAccuracy",label:"Critical facts recalled",suffix:"%"}, {key:"sequenceScore",label:"Sequencing",suffix:"%"}],
    reportBreakdown: ShortTermMemoryReportBreakdown,
    hasReportBreakdown: hasShortTermMemoryReportBreakdown,
  },
  {
    ...requireCatalog("call-simulation"),
    headlineMetrics: [{key:"totalEarnedScore",label:"Marks",maximumKey:"maxScore"}, {key:"criticalErrorsCount",label:"Critical errors"}, {key:"scoringStatus",label:"Marking"}],
    reportBreakdown: CallSimulationReportBreakdown,
    hasReportBreakdown: hasCallSimulationReportBreakdown,
  },
];

const bySlug = new Map(plugins.map((plugin) => [plugin.slug, plugin]));

export function getAssessmentUiPlugin(slug: string) {
  return bySlug.get(slug);
}

export function getAssessmentPluginTitle(slug: string): string | undefined {
  return getAssessmentUiPlugin(slug)?.title;
}

export function getAssessmentPluginIcon(slug: string) {
  return getAssessmentUiPlugin(slug)?.icon;
}

export function listAssessmentUiPlugins() {
  return [...plugins];
}

export function listAssessmentSlugs(): string[] {
  return CANDIDATE_ASSESSMENT_CATALOG.map((item) => item.slug);
}

export function getTimedAssessmentSlugs(): Set<string> {
  return new Set(CANDIDATE_ASSESSMENT_CATALOG.map((item) => item.slug));
}

export { candidateAssessmentItems, completionLabels } from "./candidate-catalog";
