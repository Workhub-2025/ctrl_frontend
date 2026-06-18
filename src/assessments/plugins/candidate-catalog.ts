import {
  ClipboardCheck,
  Keyboard,
  ListOrdered,
  Phone,
  type LucideIcon,
} from "lucide-react";

import { getAssessmentCardDuration } from "@/lib/assessment-catalog-defaults";
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
    slug: "typing",
    title: "Typing Assessment",
    description:
      "Complete a timed typing exercise designed to assess speed and accuracy.",
    href: getAssessmentPagePath("typing"),
    duration: getAssessmentCardDuration("typing"),
    icon: Keyboard,
  },
  {
    slug: "call-simulation",
    title: "Call Simulation",
    description:
      "Listen to a simulated call and record the key details clearly and accurately.",
    href: getAssessmentPagePath("call-simulation"),
    duration: getAssessmentCardDuration("call-simulation"),
    icon: Phone,
  },
  {
    slug: "situational-judgement",
    title: "Situational Judgement Assessment",
    description:
      "Respond to realistic scenarios that assess judgement, prioritisation, and decision-making.",
    href: getAssessmentPagePath("situational-judgement"),
    duration: getAssessmentCardDuration("situational-judgement"),
    icon: ClipboardCheck,
  },
  {
    slug: "prioritisation",
    title: "Prioritisation Judgement Assessment",
    description:
      "Rank incident sets from highest to lowest priority to show operational risk judgement.",
    href: getAssessmentPagePath("prioritisation"),
    duration: getAssessmentCardDuration("prioritisation"),
    icon: ListOrdered,
  },
];

export const candidateAssessmentItems = CANDIDATE_ASSESSMENT_CATALOG.map((item) => ({
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
