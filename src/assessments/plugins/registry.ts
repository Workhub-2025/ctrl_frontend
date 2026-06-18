import {
  CallSimulationTest,
  PrioritisationTest,
  SituationalJudgementTest,
  TypingTest,
} from "@/components/assessment";
import type { PlatformAssessmentSlug } from "@/lib/assessment-slug";
import { CANDIDATE_ASSESSMENT_CATALOG } from "./candidate-catalog";
import { getAssessmentSubmitUrl } from "./helpers";
import { CallSimulationReportBreakdown } from "./report/call-simulation-breakdown";
import { PrioritisationReportBreakdown } from "./report/prioritisation-breakdown";
import {
  hasCallSimulationReportBreakdown,
  hasPrioritisationReportBreakdown,
  hasSituationalJudgementReportBreakdown,
  hasTypingReportBreakdown,
} from "./report/shared";
import { SituationalJudgementReportBreakdown } from "./report/situational-judgement-breakdown";
import { TypingReportBreakdown } from "./report/typing-breakdown";
import type { AssessmentUiPlugin } from "./types";

const pluginRuntimeBySlug: Record<
  PlatformAssessmentSlug,
  Omit<AssessmentUiPlugin, keyof (typeof CANDIDATE_ASSESSMENT_CATALOG)[number]>
> = {
  typing: {
    timed: true,
    supportsHeartbeat: true,
    requiresServerInit: true,
    strapiSessionPath: "/assessment/typing/session",
    component: TypingTest,
    shellTitle: "Typing Assessment",
    reportBreakdown: TypingReportBreakdown,
    hasReportBreakdown: hasTypingReportBreakdown,
  },
  "call-simulation": {
    timed: true,
    supportsHeartbeat: true,
    strapiSessionPath: "/assessment/call-simulation/session",
    component: CallSimulationTest,
    shellTitle: "Call Simulation",
    reportBreakdown: CallSimulationReportBreakdown,
    hasReportBreakdown: hasCallSimulationReportBreakdown,
  },
  "situational-judgement": {
    timed: true,
    supportsHeartbeat: true,
    strapiSessionPath: "/assessment/situational-judgement/session",
    component: SituationalJudgementTest,
    shellTitle: "Situational Judgement Assessment",
    reportBreakdown: SituationalJudgementReportBreakdown,
    hasReportBreakdown: hasSituationalJudgementReportBreakdown,
  },
  prioritisation: {
    timed: true,
    supportsHeartbeat: true,
    strapiSessionPath: "/assessment/prioritisation/session",
    component: PrioritisationTest,
    shellTitle: "Prioritisation Judgement Assessment",
    reportBreakdown: PrioritisationReportBreakdown,
    hasReportBreakdown: hasPrioritisationReportBreakdown,
  },
};

const plugins: AssessmentUiPlugin[] = CANDIDATE_ASSESSMENT_CATALOG.map((catalog) => ({
  ...catalog,
  ...pluginRuntimeBySlug[catalog.slug],
}));

const pluginMap = new Map(plugins.map((plugin) => [plugin.slug, plugin]));

export function getAssessmentUiPlugin(slug: string): AssessmentUiPlugin | undefined {
  return pluginMap.get(slug);
}

export function getAssessmentPluginTitle(slug: string): string | undefined {
  return getAssessmentUiPlugin(slug)?.title;
}

export function getAssessmentPluginIcon(slug: string) {
  return getAssessmentUiPlugin(slug)?.icon;
}

export function listAssessmentUiPlugins(): AssessmentUiPlugin[] {
  return [...plugins];
}

export function listAssessmentSlugs(): string[] {
  return plugins.map((plugin) => plugin.slug);
}

export function getTimedAssessmentSlugs(): Set<string> {
  return new Set(plugins.filter((plugin) => plugin.timed).map((plugin) => plugin.slug));
}

export { candidateAssessmentItems, completionLabels } from "./candidate-catalog";
export { getAssessmentSubmitUrl };
