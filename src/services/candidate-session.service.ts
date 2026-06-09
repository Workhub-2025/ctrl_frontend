import { fetchApi } from "@/lib/fetch-client";

export type CandidatePortalStatus =
  | "awaiting_assessment"
  | "in_progress"
  | "completed"
  | "progressed"
  | "unsuccessful"
  | "soft_locked";

export type CandidatePortalAssessment = {
  documentId?: string;
  slug?: string;
  name?: string;
  status?: "available" | "completed" | "not_open" | string;
  isAvailable?: boolean;
  availableFrom?: string | null;
  completedAt?: string | null;
};

export type CandidatePortalApplication = {
  documentId?: string;
  candidateCode?: string;
  mode?: "in_person" | "remote" | string;
  sessionStatus?: string;
  expiresAt?: string | null;
  lockedUntil?: string | null;
  usedAt?: string | null;
  completedAt?: string | null;
  sessionStartsAt?: string | null;
  portalStatus?: CandidatePortalStatus | string;
  completion?: {
    completed?: number;
    total?: number;
  };
  campaign?: {
    documentId?: string;
    name?: string;
    jobRole?: string;
    endDate?: string | null;
    startDate?: string | null;
    location?: string | null;
  } | null;
  assessmentSession?: {
    documentId?: string;
    name?: string;
    startsAt?: string | null;
    sessionStatus?: string;
  } | null;
  assessments?: CandidatePortalAssessment[];
};

type CandidateApplicationsResponse = {
  data?: CandidatePortalApplication[];
};

type CandidateJoinResponse = {
  data?: CandidatePortalApplication;
};

let myApplicationsInFlight: Promise<CandidatePortalApplication[]> | null = null;
let myApplicationsCache: CandidatePortalApplication[] | null = null;
let myApplicationsFetchedAt = 0;
const CANDIDATE_APPLICATIONS_CACHE_TTL_MS = 30_000;

function hasFreshApplicationsCache() {
  return (
    Boolean(myApplicationsCache) &&
    myApplicationsFetchedAt > 0 &&
    Date.now() - myApplicationsFetchedAt < CANDIDATE_APPLICATIONS_CACHE_TTL_MS
  );
}

export class CandidateSessionService {
  private static readonly BASE_PATH = "/candidate-sessions";

  static async getMyApplications(options?: {
    force?: boolean;
  }): Promise<CandidatePortalApplication[]> {
    if (!options?.force && hasFreshApplicationsCache()) {
      return myApplicationsCache!;
    }

    if (!options?.force && myApplicationsInFlight) {
      return myApplicationsInFlight;
    }

    const path = options?.force
      ? `${this.BASE_PATH}/me?_t=${Date.now()}`
      : `${this.BASE_PATH}/me`;

    myApplicationsInFlight = fetchApi
      .get<CandidateApplicationsResponse>(path, {
        cache: "no-store",
      })
      .then((response) => {
        const applications = Array.isArray(response.data) ? response.data : [];
        myApplicationsCache = applications;
        myApplicationsFetchedAt = Date.now();
        return applications;
      })
      .finally(() => {
        myApplicationsInFlight = null;
      });

    return myApplicationsInFlight;
  }

  static getMyApplicationsLastRefresh(): number | null {
    return myApplicationsFetchedAt || null;
  }

  static async joinWithAccessCode(
    accessCode: string
  ): Promise<CandidatePortalApplication | null> {
    const response = await fetchApi.post<CandidateJoinResponse>(
      `${this.BASE_PATH}/join`,
      { accessCode }
    );

    myApplicationsInFlight = null;
    myApplicationsCache = null;
    myApplicationsFetchedAt = 0;

    return response.data ?? null;
  }

  static async joinWithAccessCodeForJwt(
    accessCode: string,
    jwt: string
  ): Promise<CandidatePortalApplication | null> {
    const response = await fetchApi.post<CandidateJoinResponse>(
      `${this.BASE_PATH}/join`,
      { accessCode },
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      }
    );

    myApplicationsInFlight = null;
    myApplicationsCache = null;
    myApplicationsFetchedAt = 0;

    return response.data ?? null;
  }
}
