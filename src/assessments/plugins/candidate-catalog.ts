import { Brain, Keyboard, ListOrdered, Phone, Scale, type LucideIcon } from "lucide-react";

import type { PlatformAssessmentSlug } from "@/lib/assessment-slug";

import { getAssessmentPagePath } from "./helpers";

export type CandidateAssessmentCatalogItem = {
  slug: PlatformAssessmentSlug;
  title: string;
  description: string;
  href: string;
  duration: string;
  icon: LucideIcon;
};

/** Lightweight assessment metadata for candidate portal surfaces (no test components). */
export const CANDIDATE_ASSESSMENT_CATALOG: CandidateAssessmentCatalogItem[] = [
  {
    slug: "call-simulation",
    title: "Simulated call",
    description:
      "Practice plus two assessed calls — capture caller, system, intelligence and incident information.",
    href: getAssessmentPagePath("call-simulation"),
    duration: "15–20 minutes",
    icon: Phone,
  },
  {
    slug: "prioritisation",
    title: "Prioritisation judgement",
    description: "Rank competing incidents by urgency, seriousness, vulnerability, immediacy and potential risk.",
    href: getAssessmentPagePath("prioritisation"),
    duration: "35–45 minutes",
    icon: ListOrdered,
  },
  {
    slug: "situational-judgement",
    title: "Situational judgement",
    description: "Choose the most and least effective response to 20 workplace situations.",
    href: getAssessmentPagePath("situational-judgement"),
    duration: "30–40 minutes",
    icon: Scale,
  },
  {
    slug: "short-term-memory",
    title: "Short-term memory",
    description: "Retain an operational briefing through interruption, reconstruct key facts and correct the record.",
    href: getAssessmentPagePath("short-term-memory"),
    duration: "25–35 minutes",
    icon: Brain,
  },
  {
    slug: "typing",
    title: "Typing",
    description: "Measure typing speed, accuracy and stability across three sustained passages.",
    href: getAssessmentPagePath("typing"),
    duration: "7–10 minutes",
    icon: Keyboard,
  },
];

export const candidateAssessmentItems = CANDIDATE_ASSESSMENT_CATALOG.map((item) => ({
  slug: item.slug,
  icon: item.icon,
  title: item.title,
  description: item.description,
  href: item.href,
  duration: item.duration,
  status: "Available now" as const,
}));

export const completionLabels: Record<string, string> = Object.fromEntries(
  CANDIDATE_ASSESSMENT_CATALOG.map((item) => [item.slug, item.title]),
);
