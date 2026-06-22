import "server-only";

import { cache } from "react";
import {
  ASSESSMENT_CATALOGUE_DEFAULTS,
  CALL_SIMULATION_CALL_COUNT,
  PJA_ROUND_COUNT,
  SJT_QUESTION_COUNT,
  STM_INFORMATION_SECONDS,
  STM_DISTRACTION_SECONDS,
  STM_RECALL_SECONDS,
  STANDARD_ASSESSMENT_TIME_LIMIT_SECONDS,
  TYPING_ACCURACY_THRESHOLD,
  TYPING_ROUND_COUNT,
  TYPING_TIME_LIMIT_PER_ROUND_SECONDS,
  TYPING_WPM_THRESHOLD,
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
  iconKey: "typing" | "call-simulation" | "situational-judgement" | "prioritisation" | "short-term-memory" | "default";
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
  "assessment-config.typing": {
    iconKey: "typing",
    skills: ["Speed", "Accuracy", "Written capture"],
    fallbackSummary: "Measure speed and accuracy for operational documentation.",
    whyItMatters:
      "Confirms whether candidates can capture information accurately at pace.",
    videoLabel: "Typing assessment walkthrough",
  },
  "assessment-config.call-simulation": {
    iconKey: "call-simulation",
    skills: ["Listening", "Information capture", "Composure"],
    fallbackSummary: "Assess candidate performance during a simulated operational call.",
    whyItMatters:
      "Shows whether candidates can listen, prioritise, and record essential detail under pressure.",
    videoLabel: "Call simulation preview",
  },
  "assessment-config.situational-judgement": {
    iconKey: "situational-judgement",
    skills: ["Judgement", "Decision consistency", "Operational reasoning"],
    fallbackSummary: "Evaluate decisions across realistic workplace scenarios.",
    whyItMatters:
      "Shows how candidates reason through role-relevant decisions, not just the answer they choose.",
    videoLabel: "Situational judgement demo",
  },
  "assessment-config.prioritisation": {
    iconKey: "prioritisation",
    skills: ["Prioritisation", "Incident triage", "Operational judgement"],
    fallbackSummary:
      "Assess how candidates prioritise operational work and competing incidents.",
    whyItMatters:
      "Shows whether candidates can identify urgency, sequence work sensibly, and make defensible operational decisions.",
    videoLabel: "Prioritisation assessment demo",
  },
  "assessment-config.short-term-memory": {
    iconKey: "short-term-memory",
    skills: ["Memory", "Information retention", "Attention under distraction"],
    fallbackSummary:
      "Measure immediate recall of operational details after a timed distraction task.",
    whyItMatters:
      "Shows whether candidates can retain and accurately recall critical information under realistic working-memory pressure.",
    videoLabel: "Short-term memory assessment demo",
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

const platformAssessmentFallbacks: StrapiAssessment[] = [
  {
    id: 1,
    slug: "typing",
    displayName: "Typing Assessment",
    description:
      "Measures transcription speed and accuracy using one practice run and three scored typing runs.",
    isActive: true,
    order: 1,
    maxAttempts: 1,
    config: {
      __component: "assessment-config.typing",
      roundCount: TYPING_ROUND_COUNT,
      timeLimitPerRound: TYPING_TIME_LIMIT_PER_ROUND_SECONDS,
      minWpm: TYPING_WPM_THRESHOLD,
      minAccuracy: TYPING_ACCURACY_THRESHOLD,
      passingScore: ASSESSMENT_CATALOGUE_DEFAULTS.typing.passingScore,
    },
  },
  {
    id: 2,
    slug: "situational-judgement",
    displayName: "Situational Judgement Assessment",
    description: "Measures behavioural judgement using best/worst responses across realistic workplace scenarios.",
    isActive: true,
    order: 2,
    maxAttempts: 1,
    config: {
      __component: "assessment-config.situational-judgement",
      questionCount: SJT_QUESTION_COUNT,
      timeLimitSeconds: STANDARD_ASSESSMENT_TIME_LIMIT_SECONDS,
      passingScore: ASSESSMENT_CATALOGUE_DEFAULTS["situational-judgement"].passingScore,
    },
  },
  {
    id: 3,
    slug: "prioritisation",
    displayName: "Prioritisation Judgement Assessment",
    description:
      "Measures risk-aware incident prioritisation using six-incident ranking sets.",
    isActive: true,
    order: 3,
    maxAttempts: 1,
    config: {
      __component: "assessment-config.prioritisation",
      roundCount: PJA_ROUND_COUNT,
      timeLimitSeconds: STANDARD_ASSESSMENT_TIME_LIMIT_SECONDS,
      passingScore: ASSESSMENT_CATALOGUE_DEFAULTS.prioritisation.passingScore,
    },
  },
  {
    id: 4,
    slug: "call-simulation",
    displayName: "Call Simulation",
    description:
      "Assesses call handling, listening accuracy, and structured information capture.",
    isActive: true,
    order: 4,
    maxAttempts: 1,
    config: {
      __component: "assessment-config.call-simulation",
      callCount: CALL_SIMULATION_CALL_COUNT,
      passingScore: ASSESSMENT_CATALOGUE_DEFAULTS["call-simulation"].passingScore,
      evaluationRubric: "",
    },
  },
];

function getFallbackAssessments(): HiringManagerAssessment[] {
  return platformAssessmentFallbacks
    .map(normalizeAssessment)
    .filter((assessment): assessment is HiringManagerAssessment => Boolean(assessment));
}

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
    case "assessment-config.typing":
      return (
        (config.roundCount ?? TYPING_ROUND_COUNT) *
        (config.timeLimitPerRound ?? TYPING_TIME_LIMIT_PER_ROUND_SECONDS)
      );
    case "assessment-config.situational-judgement":
      return STANDARD_ASSESSMENT_TIME_LIMIT_SECONDS;
    case "assessment-config.prioritisation":
      return STANDARD_ASSESSMENT_TIME_LIMIT_SECONDS;
    case "assessment-config.call-simulation":
      return config.callCount ? config.callCount * 240 : null;
    case "assessment-config.short-term-memory": {
      const informationSeconds = config.informationSeconds ?? STM_INFORMATION_SECONDS;
      const distractionSeconds = config.distractionSeconds ?? STM_DISTRACTION_SECONDS;
      const recallSeconds = config.recallSeconds ?? STM_RECALL_SECONDS;
      return informationSeconds + distractionSeconds + recallSeconds + 30;
    }
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
    availableVersions: [{ version: "1.0.0", title: "v1.0.0", description: null }],
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

  return versions.length > 0
    ? versions
    : [{ version: "1.0.0", title: "v1.0.0", description: null }];
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
        assessments: getFallbackAssessments(),
        error:
          "No active assessments came back from Strapi yet, so the portal is showing the default MVP assessment catalogue.",
      };
    } catch (error) {
      console.error("[getHiringManagerAssessments] Failed to load Strapi assessments", error);
      return {
        assessments: getFallbackAssessments(),
        error:
          "Assessment library could not be loaded from Strapi, so the portal is showing the default MVP assessment catalogue. Check the backend is running, seeded, and the frontend has a Strapi API token or assessment read permission.",
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
