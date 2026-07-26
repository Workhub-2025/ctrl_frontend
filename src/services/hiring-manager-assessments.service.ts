import "server-only";

import { cache } from "react";

import {
  ASSESSMENT_CATALOGUE_DEFAULTS,
  formatEstimatedCompletion,
} from "@/lib/assessment-catalog-defaults";
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
  /** Campaign builder needs version banks; the library view does not. */
  includeVersions?: boolean;
};

function mapCatalogueItem(
  item: {
    definitionId: string;
    releaseId: string;
    releaseVersion?: string | null;
    slug: string;
    title: string;
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
      ).map((release) => ({
        version: release.releaseVersion,
        releaseId: release.releaseId,
        title: releaseLabel(item.slug, release.releaseVersion),
        description: null,
      }))
    : [];

  return {
    id: item.definitionId,
    documentId: item.definitionId,
    slug: item.slug,
    title: item.title,
    summary: meta.fallbackSummary,
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
    entitlementTier: "core",
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
