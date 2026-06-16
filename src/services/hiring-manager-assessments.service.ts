import "server-only";

type StrapiAssessmentResponse = {
  data?: unknown[];
};

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");
const stripLeadingSlashes = (value: string) => value.replace(/^\/+/, "");

function getStrapiBaseUrl() {
  return stripTrailingSlashes(
    process.env.STRAPI_API_URL ??
      process.env.NEXT_PUBLIC_STRAPI_API_URL ??
      "http://localhost:1337/api"
  );
}

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
    const [{ getServerSession }, { authOptions }] = await Promise.all([
      import("next-auth/next"),
      import("@/lib/auth/next-auth-options"),
    ]);
    const session = await getServerSession(authOptions);
    return session?.user?.jwt || getStrapiApiToken();
  } catch {
    return getStrapiApiToken();
  }
}

async function fetchStrapi<T>(path: string): Promise<T> {
  const token = await getStrapiAuthToken();
  const response = await fetch(
    `${getStrapiBaseUrl()}/${stripLeadingSlashes(path)}`,
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

type StrapiAssessment = {
  id?: number;
  documentId?: string;
  displayName?: string;
  slug?: string;
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
  minWpm?: number;
  minAccuracy?: number;
  questionCount?: number;
  passingPercentage?: number;
  passingScore?: number;
  callCount?: number;
  evaluationRubric?: string | null;
};

export type AssessmentVersionOption = {
  version: string;
  title: string;
  description: string | null;
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
  iconKey: "typing" | "call-simulation" | "situational-judgement" | "prioritisation" | "default";
  configType: string;
  isActive: boolean;
  passingScore: number | null;
  maxAttempts: number | null;
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
    timeLimitSeconds: 90,
    passingScore: 70,
    maxAttempts: 1,
    config: {
      __component: "assessment-config.typing",
      roundCount: 1,
      timeLimitPerRound: 90,
      minWpm: 40,
      minAccuracy: 95,
    },
  },
  {
    id: 2,
    slug: "situational-judgement",
    displayName: "Situational Judgement Assessment",
    description: "Measures behavioural judgement using best/worst responses across realistic workplace scenarios.",
    isActive: true,
    order: 2,
    passingScore: 70,
    maxAttempts: 1,
    config: {
      __component: "assessment-config.situational-judgement",
      questionCount: 20,
      passingPercentage: 70,
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
    passingScore: 65,
    maxAttempts: 1,
    config: {
      __component: "assessment-config.prioritisation",
      roundCount: 15,
      passingScore: 65,
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
    passingScore: 70,
    maxAttempts: 1,
    config: {
      __component: "assessment-config.call-simulation",
      callCount: 1,
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
  if (assessment.timeLimitSeconds && assessment.timeLimitSeconds > 0) {
    return assessment.timeLimitSeconds;
  }

  switch (config?.__component) {
    case "assessment-config.typing":
      return (config.roundCount ?? 1) * (config.timeLimitPerRound ?? 90);
    case "assessment-config.situational-judgement":
      return config.questionCount ? config.questionCount * 60 : null;
    case "assessment-config.prioritisation":
      return null;
    case "assessment-config.call-simulation":
      return config.callCount ? config.callCount * 240 : null;
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
    passingScore: assessment.passingScore ?? null,
    maxAttempts: assessment.maxAttempts ?? null,
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

export async function getHiringManagerAssessments(): Promise<{
  assessments: HiringManagerAssessment[];
  error: string | null;
}> {
  try {
    const response = await fetchStrapi<StrapiAssessmentResponse>(
      "/assessments?populate[config][populate]=*&filters[isActive][$eq]=true&sort[0]=order:asc&sort[1]=displayName:asc"
    );
    const normalizedAssessments = (response.data ?? [])
      .map(normalizeAssessment)
      .filter((assessment): assessment is HiringManagerAssessment => Boolean(assessment));

    const assessments = await Promise.all(
      normalizedAssessments.map(async (assessment) => {
        try {
          return {
            ...assessment,
            availableVersions: await getAssessmentVersions(assessment.slug),
          };
        } catch (error) {
          console.warn(
            `[getHiringManagerAssessments] Failed to load versions for ${assessment.slug}`,
            error
          );
          return assessment;
        }
      })
    );

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
}
