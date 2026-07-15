import "server-only";

import { cache } from "react";
import {
  ASSESSMENT_CATALOGUE_DEFAULTS,
} from "@/lib/assessment-catalog-defaults";
import { isAssessmentEntitledForClient } from "@/lib/client/entitlements";
import {
  PORTAL_CATALOGUE_CACHE_KEY,
  PORTAL_CATALOGUE_TTL_MS,
  PORTAL_USER_SCOPED_TTL_MS,
  portalAssessmentVersionCacheKey,
  portalClientFeaturesClientCacheKey,
  portalClientTenantCacheKey,
} from "@/lib/portal-cache-keys";
import { getServerAuthSub } from "@/lib/portal-server-auth";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";
import { getStrapiApiBaseUrl, joinStrapiApiPath } from "@/lib/strapi-server";

type StrapiAssessmentResponse = {
  data?: unknown[];
};

const ASSESSMENT_CATALOGUE_PATH = "/assessment/platform/catalogue";

/** Catalogue rows change rarely — shared Upstash cache (5 min), entitlement filter applied after read. */
const CLIENT_FEATURES_REVALIDATE_SECONDS = PORTAL_USER_SCOPED_TTL_MS / 1000;

function getStrapiApiToken() {
  // This service only reads assessment content. Prefer a read-only token and
  // never reach for the full-access token here — the user's session JWT is the
  // primary credential (see getStrapiAuthToken).
  return (
    process.env.STRAPI_API_READONLY_TOKEN ||
    process.env.STRAPI_API_TOKEN ||
    undefined
  );
}

async function getStrapiAuthToken() {
  try {
    const { getServerStrapiJwt } = await import("@/lib/auth/strapi-jwt");
    return (await getServerStrapiJwt()) || getStrapiApiToken();
  } catch {
    return getStrapiApiToken();
  }
}

async function fetchStrapi<T>(path: string): Promise<T> {
  const token = await getStrapiAuthToken();
  const response = await fetch(
    joinStrapiApiPath(getStrapiApiBaseUrl(), path),
    {
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Strapi responded ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

async function fetchStrapiCatalogue(): Promise<unknown[]> {
  const token = getStrapiApiToken() ?? (await getStrapiAuthToken()) ?? undefined;
  const response = await fetch(
    joinStrapiApiPath(getStrapiApiBaseUrl(), ASSESSMENT_CATALOGUE_PATH),
    {
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Strapi responded ${response.status}: ${response.statusText}`);
  }

  const body = (await response.json()) as StrapiAssessmentResponse;
  return body.data ?? [];
}

function getCachedAssessmentCatalogue(): Promise<unknown[]> {
  return portalServerCacheGetOrSet(
    PORTAL_CATALOGUE_CACHE_KEY,
    PORTAL_CATALOGUE_TTL_MS,
    fetchStrapiCatalogue,
  );
}

type StrapiAssessment = {
  id?: number;
  documentId?: string;
  displayName?: string;
  slug?: string;
  entitlementTier?: "core" | "premium" | string | null;
  description?: string | null;
  isActive?: boolean;
  order?: number | null;
  timeLimitSeconds?: number | null;
  passingScore?: number | null;
  maxAttempts?: number | null;
  config?: AssessmentConfig[] | AssessmentConfig | null;
  attributes?: StrapiAssessment;
};

type AssessmentConfig = {
  __component?: string;
  roundCount?: number;
  timeLimitPerRound?: number;
  timeLimitSeconds?: number;
  minWpm?: number;
  minAccuracy?: number;
  questionCount?: number;
  passingScore?: number;
  callCount?: number;
  informationSeconds?: number;
  distractionSeconds?: number;
  recallSeconds?: number;
  evaluationRubric?: string | null;
};

function resolvePassingScore(
  config: AssessmentConfig | null,
  assessment: StrapiAssessment,
): number | null {
  if (typeof config?.passingScore === "number") {
    return config.passingScore;
  }
  if (typeof assessment.passingScore === "number") {
    return assessment.passingScore;
  }
  const slug = assessment.slug?.trim() as keyof typeof ASSESSMENT_CATALOGUE_DEFAULTS | undefined;
  if (slug && ASSESSMENT_CATALOGUE_DEFAULTS[slug]) {
    return ASSESSMENT_CATALOGUE_DEFAULTS[slug].passingScore;
  }
  return null;
}

export type AssessmentVersionOption = {
  version: string;
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
};

const configMeta: Record<
  string,
  {
    iconKey: HiringManagerAssessment["iconKey"];
    skills: string[];
    fallbackSummary: string;
    whyItMatters: string;
    videoLabel: string;
  }
> = {
  "assessment-config.call-simulation": {
    iconKey: "call-simulation",
    skills: ["Listening", "Information capture", "Composure"],
    fallbackSummary: "Assess candidate performance during a simulated operational call.",
    whyItMatters:
      "Shows whether candidates can listen, prioritise, and record essential detail under pressure.",
    videoLabel: "Call simulation preview",
  },
};

const fallbackMeta = {
  iconKey: "default" as const,
  skills: ["Evidence", "Role fit", "Decision support"],
  fallbackSummary: "Configured assessment module from Strapi.",
  whyItMatters:
    "Adds structured evidence to the campaign so hiring teams can compare candidates consistently.",
  videoLabel: "Assessment information",
};

function getAssessmentAttributes(item: unknown): StrapiAssessment {
  const assessment = (item ?? {}) as StrapiAssessment;
  return {
    ...assessment,
    ...(assessment.attributes ?? {}),
  };
}

function getConfig(config: StrapiAssessment["config"]): AssessmentConfig | null {
  if (Array.isArray(config)) {
    return config[0] ?? null;
  }
  return config ?? null;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) {
    return "Configured in Strapi";
  }

  const minutes = Math.ceil(seconds / 60);
  return `${minutes} min`;
}

function inferDurationSeconds(
  assessment: StrapiAssessment,
  config: AssessmentConfig | null
): number | null {
  if (typeof config?.timeLimitSeconds === "number" && config.timeLimitSeconds > 0) {
    return config.timeLimitSeconds;
  }

  if (assessment.timeLimitSeconds && assessment.timeLimitSeconds > 0) {
    return assessment.timeLimitSeconds;
  }

  switch (config?.__component) {
    case "assessment-config.call-simulation":
      return config.callCount ? config.callCount * 900 : null;
    default:
      return null;
  }
}

function normalizeAssessment(item: unknown): HiringManagerAssessment | null {
  const assessment = getAssessmentAttributes(item);
  const title = assessment.displayName?.trim();
  const slug = assessment.slug?.trim();

  if (!title || !slug) {
    return null;
  }

  const config = getConfig(assessment.config);
  const meta = configMeta[config?.__component ?? ""] ?? fallbackMeta;
  const durationSeconds = inferDurationSeconds(assessment, config);

  return {
    id: assessment.documentId ?? String(assessment.id ?? slug),
    documentId: assessment.documentId,
    slug,
    title,
    summary: assessment.description?.trim() || meta.fallbackSummary,
    duration: formatDuration(durationSeconds),
    durationSeconds,
    skills: meta.skills,
    whyItMatters: assessment.description?.trim() || meta.whyItMatters,
    videoLabel: meta.videoLabel,
    iconKey: meta.iconKey,
    configType: config?.__component ?? "assessment-config.unknown",
    isActive: assessment.isActive ?? true,
    passingScore: resolvePassingScore(config, assessment),
    maxAttempts: assessment.maxAttempts ?? null,
    entitlementTier: assessment.entitlementTier === "premium" ? "premium" : "core",
    availableVersions: [],
  };
}

async function getAssessmentVersions(slug: string): Promise<AssessmentVersionOption[]> {
  const response = await fetchStrapi<{ data?: AssessmentVersionOption[] }>(
    `/assessment/${encodeURIComponent(slug)}/versions`
  );

  const versions = (response.data ?? []).filter(
    (version): version is AssessmentVersionOption =>
      Boolean(version?.version && version?.title)
  );

  return versions;
}

function getCachedAssessmentVersions(slug: string): Promise<AssessmentVersionOption[]> {
  return portalServerCacheGetOrSet(
    portalAssessmentVersionCacheKey(slug),
    PORTAL_CATALOGUE_TTL_MS,
    () => getAssessmentVersions(slug),
  );
}

async function resolveClientDocumentIdForCurrentUser(): Promise<string | null> {
  const sub = await getServerAuthSub();
  if (!sub) {
    return loadClientDocumentIdFromMe();
  }

  return portalServerCacheGetOrSet(
    portalClientTenantCacheKey(sub),
    PORTAL_USER_SCOPED_TTL_MS,
    loadClientDocumentIdFromMe,
  );
}

async function loadClientDocumentIdFromMe(): Promise<string | null> {
  try {
    const response = await fetchStrapi<{ client?: { documentId?: string } }>(
      "/users/me?populate[client][fields][0]=documentId",
    );
    return response?.client?.documentId ?? null;
  } catch {
    return null;
  }
}

async function loadClientFeaturesForClient(): Promise<Record<string, unknown>> {
  try {
    const response = await fetchStrapi<{
      client?: { features?: Record<string, unknown> };
    }>("/users/me?populate[client][fields][0]=features");
    // Cache only entitlement flags — never email, JWT, or full user profile.
    return response?.client?.features ?? {};
  } catch (error) {
    console.warn("[getHiringManagerAssessments] Failed to load client entitlements", error);
    return {};
  }
}

async function getClientFeatures(): Promise<Record<string, unknown> | null> {
  const clientDocumentId = await resolveClientDocumentIdForCurrentUser();
  if (!clientDocumentId) {
    return loadClientFeaturesForClient();
  }

  return portalServerCacheGetOrSet(
    portalClientFeaturesClientCacheKey(clientDocumentId),
    CLIENT_FEATURES_REVALIDATE_SECONDS * 1000,
    loadClientFeaturesForClient,
  );
}

function isAssessmentEntitledForHiringManager(
  item: unknown,
  clientFeatures: Record<string, unknown> | null,
) {
  const assessment = getAssessmentAttributes(item);
  return isAssessmentEntitledForClient(
    {
      slug: assessment.slug,
      entitlementTier: assessment.entitlementTier,
    },
    clientFeatures ?? {},
  );
}

export type GetHiringManagerAssessmentsOptions = {
  /** Campaign builder needs version banks; the library view does not. */
  includeVersions?: boolean;
};

async function attachAssessmentVersions(
  assessments: HiringManagerAssessment[],
): Promise<HiringManagerAssessment[]> {
  return Promise.all(
    assessments.map(async (assessment) => {
      try {
        return {
          ...assessment,
          availableVersions: await getCachedAssessmentVersions(assessment.slug),
        };
      } catch (error) {
        console.warn(
          `[getHiringManagerAssessments] Failed to load versions for ${assessment.slug}`,
          error,
        );
        return assessment;
      }
    }),
  );
}

const loadHiringManagerAssessments = cache(
  async (includeVersions: boolean): Promise<{
    assessments: HiringManagerAssessment[];
    error: string | null;
  }> => {
    try {
      const [catalogueItems, clientFeatures] = await Promise.all([
        getCachedAssessmentCatalogue(),
        getClientFeatures(),
      ]);

      const normalizedAssessments = catalogueItems
        .filter((item) => isAssessmentEntitledForHiringManager(item, clientFeatures))
        .map(normalizeAssessment)
        .filter((assessment): assessment is HiringManagerAssessment => Boolean(assessment));

      const assessments = includeVersions
        ? await attachAssessmentVersions(normalizedAssessments)
        : normalizedAssessments;

      if (assessments.length > 0) {
        return { assessments, error: null };
      }

      return {
        assessments: [],
        error:
          "No active assessment module release is available. Publish and sync a repo-reviewed module before configuring a campaign.",
      };
    } catch (error) {
      console.error("[getHiringManagerAssessments] Failed to load Strapi assessments", error);
      return {
        assessments: [],
        error:
          "Assessment library could not be loaded. No local fallback catalogue is used because releases must be repo-reviewed and mirrored by the backend.",
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
  return loadHiringManagerAssessments(options.includeVersions ?? false);
}
