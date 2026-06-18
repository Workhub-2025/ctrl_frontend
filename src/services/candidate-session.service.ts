import { fetchApi } from "@/lib/fetch-client";
import { normalizePortalError } from "@/lib/portal-fetch-cache";

export type CandidatePortalStatus =
  | "awaiting_assessment"
  | "in_progress"
  | "completed"
  | "progressed"
  | "unsuccessful"
  | "soft_locked"
  | "contract_locked";

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
let lastApplicationsForceAt = 0;

const CANDIDATE_APPLICATIONS_CACHE_TTL_MS = 90_000;
const CANDIDATE_MIN_REFETCH_MS = 5_000;

function isApplicationsErrorEmpty(message: string) {
  return /not found|404|forbidden|403/i.test(message);
}

export class CandidateSessionService {
  private static readonly APPLICATIONS_PATH = "/api/candidate/applications";

  static hasFreshApplicationsCache() {
    return (
      myApplicationsCache !== null &&
      myApplicationsFetchedAt > 0 &&
      Date.now() - myApplicationsFetchedAt < CANDIDATE_APPLICATIONS_CACHE_TTL_MS
    );
  }

  static getCachedApplications(): CandidatePortalApplication[] | null {
    return this.hasFreshApplicationsCache() ? myApplicationsCache : null;
  }

  static getMyApplicationsLastRefresh(): number | null {
    return myApplicationsFetchedAt || null;
  }

  static invalidateApplications() {
    myApplicationsInFlight = null;
    myApplicationsCache = null;
    myApplicationsFetchedAt = 0;
  }

  static async getMyApplications(options?: {
    force?: boolean;
  }): Promise<CandidatePortalApplication[]> {
    if (
      options?.force &&
      myApplicationsCache &&
      this.hasFreshApplicationsCache() &&
      Date.now() - lastApplicationsForceAt < CANDIDATE_MIN_REFETCH_MS
    ) {
      return myApplicationsCache;
    }

    if (!options?.force && this.hasFreshApplicationsCache()) {
      return myApplicationsCache!;
    }

    if (!options?.force && myApplicationsInFlight) {
      return myApplicationsInFlight;
    }

    if (options?.force) {
      lastApplicationsForceAt = Date.now();
    }

    const path = options?.force
      ? `${this.APPLICATIONS_PATH}?_t=${Date.now()}`
      : this.APPLICATIONS_PATH;

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
      .catch((error) => {
        const message = normalizePortalError(
          error instanceof Error ? error.message : "Request could not be completed",
          true
        );

        if (!message || isApplicationsErrorEmpty(error instanceof Error ? error.message : "")) {
          myApplicationsCache = myApplicationsCache ?? [];
          myApplicationsFetchedAt = Date.now();
          return myApplicationsCache ?? [];
        }

        throw new Error(message || "We could not load your assessments. Please try again shortly.");
      })
      .finally(() => {
        myApplicationsInFlight = null;
      });

    return myApplicationsInFlight;
  }

  static async joinWithAccessCode(
    accessCode: string
  ): Promise<CandidatePortalApplication | null> {
    const response = await fetchApi.post<CandidateJoinResponse>(
      this.APPLICATIONS_PATH,
      { accessCode }
    );

    this.invalidateApplications();

    return response.data ?? null;
  }

  static async joinWithAccessCodeForJwt(
    accessCode: string,
    jwt: string
  ): Promise<CandidatePortalApplication | null> {
    const response = await fetchApi.post<CandidateJoinResponse>(
      this.APPLICATIONS_PATH,
      { accessCode },
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      }
    );

    this.invalidateApplications();

    return response.data ?? null;
  }
}
