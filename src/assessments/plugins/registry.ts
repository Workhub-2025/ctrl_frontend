import {
  CallSimulationTest,
  PrioritisationTest,
  SituationalJudgementTest,
  TypingTest,
} from "@/components/assessment";
import {
  ClipboardCheck,
  Keyboard,
  ListOrdered,
  Phone,
} from "lucide-react";
import { getAssessmentPagePath, getAssessmentSubmitUrl } from "./helpers";
import { getAssessmentCardDuration } from "@/lib/assessment-catalog-defaults";
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

const plugins: AssessmentUiPlugin[] = [
  {
    slug: "typing",
    title: "Typing Assessment",
    description:
      "Complete a timed typing exercise designed to assess speed and accuracy.",
    href: getAssessmentPagePath("typing"),
    duration: getAssessmentCardDuration("typing"),
    icon: Keyboard,
    timed: true,
    supportsHeartbeat: true,
    requiresServerInit: true,
    strapiSessionPath: "/assessment/typing/session",
    component: TypingTest,
    shellTitle: "Typing Assessment",
    reportBreakdown: TypingReportBreakdown,
    hasReportBreakdown: hasTypingReportBreakdown,
  },
  {
    slug: "call-simulation",
    title: "Call Simulation",
    description:
      "Listen to a simulated call and record the key details clearly and accurately.",
    href: getAssessmentPagePath("call-simulation"),
    duration: getAssessmentCardDuration("call-simulation"),
    icon: Phone,
    timed: true,
    supportsHeartbeat: true,
    strapiSessionPath: "/assessment/call-simulation/session",
    component: CallSimulationTest,
    shellTitle: "Call Simulation",
    reportBreakdown: CallSimulationReportBreakdown,
    hasReportBreakdown: hasCallSimulationReportBreakdown,
  },
  {
    slug: "situational-judgement",
    title: "Situational Judgement Assessment",
    description:
      "Respond to realistic scenarios that assess judgement, prioritisation, and decision-making.",
    href: getAssessmentPagePath("situational-judgement"),
    duration: getAssessmentCardDuration("situational-judgement"),
    icon: ClipboardCheck,
    timed: true,
    supportsHeartbeat: true,
    strapiSessionPath: "/assessment/situational-judgement/session",
    component: SituationalJudgementTest,
    shellTitle: "Situational Judgement Assessment",
    reportBreakdown: SituationalJudgementReportBreakdown,
    hasReportBreakdown: hasSituationalJudgementReportBreakdown,
  },
  {
    slug: "prioritisation",
    title: "Prioritisation Judgement Assessment",
    description:
      "Rank incident sets from highest to lowest priority to show operational risk judgement.",
    href: getAssessmentPagePath("prioritisation"),
    duration: getAssessmentCardDuration("prioritisation"),
    icon: ListOrdered,
    timed: true,
    supportsHeartbeat: true,
    strapiSessionPath: "/assessment/prioritisation/session",
    component: PrioritisationTest,
    shellTitle: "Prioritisation Judgement Assessment",
    reportBreakdown: PrioritisationReportBreakdown,
    hasReportBreakdown: hasPrioritisationReportBreakdown,
  },
];

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

export { getAssessmentSubmitUrl };

export const candidateAssessmentItems = plugins.map((plugin) => ({
  icon: plugin.icon,
  title: plugin.title,
  description: plugin.description,
  href: plugin.href,
  duration: plugin.duration,
  status: "Available now" as const,
}));

export const completionLabels = Object.fromEntries(
  plugins.map((plugin) => [plugin.slug, plugin.title]),
);
