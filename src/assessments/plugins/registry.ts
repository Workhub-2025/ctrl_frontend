import {
  CallSimulationReportBreakdown,
} from "./report/call-simulation-breakdown";
import {
  PrioritisationReportBreakdown,
  ShortTermMemoryReportBreakdown,
  SituationalJudgementReportBreakdown,
  TypingReportBreakdown,
  hasGenericReportBreakdown,
} from "./report/generic-breakdown";
import { hasCallSimulationReportBreakdown } from "./report/shared";
import { CANDIDATE_ASSESSMENT_CATALOG } from "./candidate-catalog";
import type { AssessmentReportBreakdownProps } from "./report/types";
import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";

type AssessmentUiPlugin = {
  slug: string;
  title: string;
  description: string;
  href: string;
  duration: string;
  icon: LucideIcon;
  reportBreakdown: ComponentType<AssessmentReportBreakdownProps>;
  hasReportBreakdown: (
    result: AssessmentReportBreakdownProps["result"],
  ) => boolean;
};

function requireCatalog(slug: string) {
  const catalog = CANDIDATE_ASSESSMENT_CATALOG.find((item) => item.slug === slug);
  if (!catalog) {
    throw new Error(`Assessment UI plugin metadata missing for ${slug}`);
  }
  return catalog;
}

const plugins: AssessmentUiPlugin[] = [
  {
    ...requireCatalog("typing"),
    reportBreakdown: TypingReportBreakdown,
    hasReportBreakdown: hasGenericReportBreakdown,
  },
  {
    ...requireCatalog("situational-judgement"),
    reportBreakdown: SituationalJudgementReportBreakdown,
    hasReportBreakdown: hasGenericReportBreakdown,
  },
  {
    ...requireCatalog("prioritisation"),
    reportBreakdown: PrioritisationReportBreakdown,
    hasReportBreakdown: hasGenericReportBreakdown,
  },
  {
    ...requireCatalog("short-term-memory"),
    reportBreakdown: ShortTermMemoryReportBreakdown,
    hasReportBreakdown: hasGenericReportBreakdown,
  },
  {
    ...requireCatalog("call-simulation"),
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
