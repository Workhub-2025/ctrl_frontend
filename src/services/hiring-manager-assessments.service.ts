import "server-only";

import { cache } from "react";

import {
  ASSESSMENT_CATALOGUE_DEFAULTS,
  formatEstimatedCompletion,
} from "@/lib/assessment-catalog-defaults";
import { getAssessmentLibraryPreview } from "@/lib/assessment-library-previews";
import {
  assessmentEntitlementTier,
  getAssessmentPlatformEntry,
} from "@/lib/assessment-platform-registry";
import { isKnownAssessmentSlug } from "@/lib/assessment-slug";
import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import { createFirebaseRecruitmentApi } from "@/lib/firebase-recruitment-api";

export type AssessmentVersionOption = {
  version: string;
  releaseId?: string;
  title: string;
  description: string | null;
  previewSamples?: string[];
  audioPreview?: {
    label: string;
    src: string;
    startSeconds: number;
    durationSeconds: number;
  } | null;
};

export type HiringManagerAssessment = {
  id: string;
  documentId?: string;
  slug: string;
  title: string;
  summary: string;
  duration: string;
  durationSeconds: number | null;
  skills: string[];
  whyItMatters: string;
  videoLabel: string;
  iconKey: "call-simulation" | "default";
  configType: string;
  isActive: boolean;
  passingScore: number | null;
  maxAttempts: number | null;
  entitlementTier: "core" | "premium" | string;
  availableVersions: AssessmentVersionOption[];
  /** Default / active release document id for stack writes. */
  activeReleaseId?: string;
};

const catalogueMeta: Record<
  string,
  {
    iconKey: HiringManagerAssessment["iconKey"];
    skills: string[];
    fallbackSummary: string;
    whyItMatters: string;
    videoLabel: string;
    configType: string;
  }
> = {
  "call-simulation": {
    iconKey: "call-simulation",
    skills: ["Listening", "Information capture", "Composure"],
    fallbackSummary:
      "Assess candidate performance during a simulated operational call.",
    whyItMatters:
      "Shows whether candidates can listen, prioritise, and record essential detail under pressure.",
    videoLabel: "Call simulation preview",
    configType: "assessment-config.call-simulation",
  },
  "situational-judgement": {
    iconKey: "default",
    skills: ["Judgement", "Communication", "Composure"],
    fallbackSummary:
      "Choose the most and least effective response to workplace situations under time pressure.",
    whyItMatters:
      "Shows how candidates balance empathy, structure and risk when handling distressed or incomplete calls.",
    videoLabel: "Situational judgement preview",
    configType: "assessment-config.situational-judgement",
  },
  prioritisation: {
    iconKey: "default",
    skills: ["Risk awareness", "Urgency", "Decision support"],
    fallbackSummary:
      "Rank competing incidents by urgency, seriousness, vulnerability, immediacy and potential risk.",
    whyItMatters:
      "Shows whether candidates can triage a busy queue without missing high-harm work.",
    videoLabel: "Prioritisation judgement preview",
    configType: "assessment-config.prioritisation",
  },
  typing: {
    iconKey: "default",
    skills: ["Speed", "Accuracy", "Stability"],
    fallbackSummary:
      "Measure typing speed, accuracy and stability across timed operational passages.",
    whyItMatters:
      "Shows whether candidates can capture caller detail clearly while the call is live.",
    videoLabel: "Typing preview",
    configType: "assessment-config.typing",
  },
  "short-term-memory": {
    iconKey: "default",
    skills: ["Retention", "Reconstruction", "Attention"],
    fallbackSummary:
      "Retain an operational briefing through interruption, then reconstruct key facts.",
    whyItMatters:
      "Shows whether candidates can hold critical detail after distraction — a core control-room skill.",
    videoLabel: "Short-term memory preview",
    configType: "assessment-config.short-term-memory",
  },
};

const fallbackMeta = {
  iconKey: "default" as const,
  skills: ["Evidence", "Role fit", "Decision support"],
  fallbackSummary: "Configured assessment module from the Firebase catalogue.",
  whyItMatters:
    "Adds structured evidence to the campaign so hiring teams can compare candidates consistently.",
  videoLabel: "Assessment information",
  configType: "assessment-config.unknown",
};

export type GetHiringManagerAssessmentsOptions = {
  /** Library browse and campaign builder both need available release versions. */
  includeVersions?: boolean;
};

function mapCatalogueItem(
  item: {
    definitionId: string;
    releaseId: string;
    releaseVersion?: string | null;
    slug: string;
    title: string;
    entitlementTier?: "core" | "premium" | string | null;
    availableReleases?: ReadonlyArray<{
      releaseId: string;
      releaseVersion: string;
      status: "active" | "retired";
    }>;
  },
  includeVersions: boolean,
): HiringManagerAssessment {
  const meta = catalogueMeta[item.slug] ?? fallbackMeta;
  const knownSlug = isKnownAssessmentSlug(item.slug) ? item.slug : null;
  const defaults = knownSlug ? ASSESSMENT_CATALOGUE_DEFAULTS[knownSlug] : null;
  const platform = getAssessmentPlatformEntry(item.slug);

  const availableVersions: AssessmentVersionOption[] = includeVersions
    ? (item.availableReleases?.length
        ? item.availableReleases
        : [
            {
              releaseId: item.releaseId,
              releaseVersion: item.releaseVersion ?? "0.0.0",
              status: "active" as const,
            },
          ]
      ).map((release) => {
        const preview = getAssessmentLibraryPreview(
          item.slug,
          release.releaseVersion,
        );
        return {
          version: release.releaseVersion,
          releaseId: release.releaseId,
          title: releaseLabel(item.slug, release.releaseVersion),
          description:
            releaseDescription(item.slug, release.releaseVersion) ??
            preview?.overview ??
            null,
          previewSamples: preview?.samples ? [...preview.samples] : undefined,
          audioPreview: preview?.audioPreview ?? null,
        };
      })
    : [];

  return {
    id: item.definitionId,
    documentId: item.definitionId,
    slug: item.slug,
    title: platform?.title ?? item.title,
    summary: platform?.description ?? meta.fallbackSummary,
    duration: knownSlug
      ? formatEstimatedCompletion(knownSlug)
      : "Configured release",
    durationSeconds: defaults?.timeLimitSeconds ?? null,
    skills: meta.skills,
    whyItMatters: meta.whyItMatters,
    videoLabel: meta.videoLabel,
    iconKey: meta.iconKey,
    configType: meta.configType,
    isActive: true,
    passingScore: defaults?.passingScore ?? null,
    maxAttempts: null,
    entitlementTier:
      item.entitlementTier === "core" || item.entitlementTier === "premium"
        ? item.entitlementTier
        : assessmentEntitlementTier(item.slug),
    availableVersions,
    activeReleaseId: item.releaseId,
  };
}

function releaseLabel(slug: string, version: string): string {
  if (slug === "call-simulation" && version === "1.1.0") {
    return `v${version} — practice + two assessed calls`;
  }
  return `v${version}`;
}

function releaseDescription(slug: string, version: string): string | null {
  if (slug === "call-simulation" && version === "1.1.0") {
    return "Includes one practice call and two assessed calls. Candidates capture caller, system, intelligence, and incident information under timed review.";
  }
  if (slug === "call-simulation" && version === "1.0.1") {
    return "Historical single-call product line. Prefer 1.1.0 for new campaigns.";
  }
  return null;
}

const loadHiringManagerAssessmentsWithVersions = cache(
  async (
    includeVersions: boolean,
  ): Promise<{
    assessments: HiringManagerAssessment[];
    error: string | null;
  }> => {
    try {
      const auth = await requireFirebaseSession("hiring_manager", "admin");
      const recruitment = createFirebaseRecruitmentApi(
        auth.domainApi,
        auth.firebaseSessionCookie,
      );
      const catalogue = await recruitment.listAssessmentCatalogue();
      const assessments = catalogue.map((item) =>
        mapCatalogueItem(item, includeVersions),
      );

      if (assessments.length > 0) {
        return { assessments, error: null };
      }

      return {
        assessments: [],
        error:
          "No active assessment module release is available. Publish a reviewed Firebase release before configuring a campaign.",
      };
    } catch (error) {
      console.error(
        "[getHiringManagerAssessments] Failed to load Firebase catalogue",
        error,
      );
      return {
        assessments: [],
        error:
          "Assessment library could not be loaded from Firebase. Confirm your session and that catalogue releases are published.",
      };
    }
  },
);

export async function getHiringManagerAssessments(
  options: GetHiringManagerAssessmentsOptions = {},
): Promise<{
  assessments: HiringManagerAssessment[];
  error: string | null;
}> {
  return loadHiringManagerAssessmentsWithVersions(
    options.includeVersions === true,
  );
}
