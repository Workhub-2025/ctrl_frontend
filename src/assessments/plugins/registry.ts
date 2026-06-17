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
import type { AssessmentUiPlugin } from "./types";

const plugins: AssessmentUiPlugin[] = [
  {
    slug: "typing",
    title: "Typing Assessment",
    description:
      "Complete a timed typing exercise designed to assess speed and accuracy.",
    href: "/assessment/typing",
    duration: "10-15 min",
    icon: Keyboard,
    timed: false,
    supportsHeartbeat: true,
    requiresServerInit: true,
    component: TypingTest,
    shellTitle: "Typing Assessment",
  },
  {
    slug: "call-simulation",
    title: "Call Simulation",
    description:
      "Listen to a simulated call and record the key details clearly and accurately.",
    href: "/assessment/call-simulation",
    duration: "10 min",
    icon: Phone,
    timed: true,
    supportsHeartbeat: true,
    component: CallSimulationTest,
    shellTitle: "Call Simulation",
  },
  {
    slug: "situational-judgement",
    title: "Situational Judgement Assessment",
    description:
      "Respond to realistic scenarios that assess judgement, prioritisation, and decision-making.",
    href: "/assessment/situational-judgement",
    duration: "15-20 min",
    icon: ClipboardCheck,
    timed: true,
    supportsHeartbeat: true,
    component: SituationalJudgementTest,
    shellTitle: "Situational Judgement Assessment",
  },
  {
    slug: "prioritisation",
    title: "Prioritisation Judgement Assessment",
    description:
      "Rank incident sets from highest to lowest priority to show operational risk judgement.",
    href: "/assessment/prioritisation",
    duration: "Untimed",
    icon: ListOrdered,
    timed: true,
    supportsHeartbeat: true,
    component: PrioritisationTest,
    shellTitle: "Prioritisation Judgement Assessment",
  },
];

const pluginMap = new Map(plugins.map((plugin) => [plugin.slug, plugin]));

export function getAssessmentUiPlugin(slug: string): AssessmentUiPlugin | undefined {
  return pluginMap.get(slug);
}

export function getAssessmentPluginTitle(slug: string): string | undefined {
  return getAssessmentUiPlugin(slug)?.title;
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
