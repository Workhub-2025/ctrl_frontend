import type { AssessmentUiPlugin } from "./types";
import TypingAssessmentPage from "./typing-page";
import SituationalJudgementAssessmentPage from "./situational-judgement-page";
import PrioritisationAssessmentPage from "./prioritisation-page";
import CallSimulationAssessmentPage from "./call-simulation-page";

const plugins: AssessmentUiPlugin[] = [
  {
    slug: "typing",
    title: "Typing Assessment",
    description:
      "Complete a timed typing exercise designed to assess speed and accuracy.",
    route: "/assessment/typing",
    duration: "10-15 min",
    Page: TypingAssessmentPage,
  },
  {
    slug: "call-simulation",
    title: "Call Simulation",
    description:
      "Listen to a simulated call and record the key details clearly and accurately.",
    route: "/assessment/call-simulation",
    duration: "10 min",
    timed: true,
    Page: CallSimulationAssessmentPage,
  },
  {
    slug: "situational-judgement",
    title: "Situational Judgement Assessment",
    description:
      "Respond to realistic scenarios that assess judgement, prioritisation, and decision-making.",
    route: "/assessment/situational-judgement",
    duration: "15-20 min",
    timed: true,
    Page: SituationalJudgementAssessmentPage,
  },
  {
    slug: "prioritisation",
    title: "Prioritisation Judgement Assessment",
    description:
      "Rank incident sets from highest to lowest priority to show operational risk judgement.",
    route: "/assessment/prioritisation",
    duration: "Untimed",
    timed: true,
    Page: PrioritisationAssessmentPage,
  },
];

const bySlug = new Map(plugins.map((plugin) => [plugin.slug, plugin]));

export function registerAssessmentPlugin(plugin: AssessmentUiPlugin): void {
  bySlug.set(plugin.slug, plugin);
}

export function getAssessmentPluginBySlug(slug: string): AssessmentUiPlugin | undefined {
  return bySlug.get(slug);
}

export function listAssessmentSlugs(): string[] {
  return plugins.map((plugin) => plugin.slug);
}

export function listAssessmentPlugins(): AssessmentUiPlugin[] {
  return [...plugins];
}

export function getTimedAssessmentSlugs(): string[] {
  return plugins.filter((plugin) => plugin.timed).map((plugin) => plugin.slug);
}

export function getAssessmentPluginTitle(slug: string): string | undefined {
  return bySlug.get(slug)?.title;
}
