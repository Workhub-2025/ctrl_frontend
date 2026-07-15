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
    title: "Call Simulation v2",
    description:
      "Handle three branching control-room incidents using live caller audio, structured capture and operational decisions.",
    href: getAssessmentPagePath("call-simulation"),
    duration: "35–45 minutes",
    icon: Phone,
  },
  {
    slug: "prioritisation",
    title: "Prioritisation v2",
    description: "Manage an evolving incident queue, allocate constrained resources and explain risk-led reprioritisation.",
    href: getAssessmentPagePath("prioritisation"),
    duration: "30–40 minutes",
    icon: ListOrdered,
  },
  {
    slug: "situational-judgement",
    title: "Situational Judgement v2",
    description: "Make branching operational decisions, respond to consequences and record evidence-led rationale.",
    href: getAssessmentPagePath("situational-judgement"),
    duration: "30–40 minutes",
    icon: Scale,
  },
  {
    slug: "short-term-memory",
    title: "Short-Term Memory v2",
    description: "Retain an operational briefing through interruption, reconstruct key facts and correct the record.",
    href: getAssessmentPagePath("short-term-memory"),
    duration: "25–35 minutes",
    icon: Brain,
  },
  {
    slug: "typing",
    title: "Typing v2",
    description: "Transcribe an operational update accurately while completing structured incident fields.",
    href: getAssessmentPagePath("typing"),
    duration: "20–30 minutes",
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
