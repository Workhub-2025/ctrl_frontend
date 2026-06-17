export type HiringManagerCampaignListItem = {
  id: string;
  documentId?: string;
  name: string;
  role: string;
  status: "Live" | "Configured" | "Draft" | "Closed" | "Archived";
  approvalStatus?: "Pending approval" | "Approved" | "Rejected";
  deliveryMode: "In-person" | "Remote" | "Hybrid";
  candidateCount: number;
  sessions: number;
  assessmentStack: string[];
  assessmentSettings?: Record<string, unknown> | null;
  nextMilestone: string;
};

export type HiringManagerAssessmentResult = {
  id: string;
  assessment: string;
  score: string;
  numericScore: number | null;
  passed?: boolean | null;
  completedAt?: string | null;
  wpm?: number | null;
  accuracy?: number | null;
  mistakeCount?: number | null;
  durationSeconds?: number | null;
  metrics?: Record<string, unknown> | null;
  rawData?: Record<string, any> | null;
};

export type HiringManagerCampaignDetail = HiringManagerCampaignListItem & {
  startDate: string;
  endDate: string;
  location: string;
  assessmentSessions: HiringManagerSessionListItem[];
  joinedCandidates: Array<{
    id: string;
    name: string;
    email?: string;
    status?: string;
    inviteStatus?: "invited" | "registered" | "started" | null;
    sessionName?: string;
    campaignId?: string;
    campaignName?: string;
    assessmentStack?: string[];
    results?: HiringManagerAssessmentResult[];
  }>;
  pendingInvites?: Array<{
    id: string;
    email: string;
    inviteStatus: "invited" | "registered" | "started";
    candidateCode?: string;
    mode?: "in_person" | "remote";
  }>;
};

export type HiringManagerSessionListItem = {
  id: string;
  documentId?: string;
  campaign: string;
  type: "In-person" | "Remote";
  status: "Upcoming" | "Live" | "Closed" | "Cancelled";
  date: string;
  startsAt?: string | null;
  location: string;
  candidateCount: number;
  candidateLimit: number;
  accessMode: string;
  accessValue: string;
  candidates: Array<{
    id: string;
    name: string;
    email?: string;
    status?: string;
    hasStartedAssessment?: boolean;
    results: HiringManagerAssessmentResult[];
  }>;
};

type CampaignsResponse = {
  data?: HiringManagerCampaignListItem[];
  error?: string;
};

type CampaignDetailResponse = {
  data?: HiringManagerCampaignDetail;
  error?: string;
};

type SessionsResponse = {
  data?: HiringManagerSessionListItem[];
  error?: string;
};

type HiringManagerOverview = {
  campaigns: HiringManagerCampaignListItem[];
  campaignDetails: HiringManagerCampaignDetail[];
  sessions: HiringManagerSessionListItem[];
};

type OverviewResponse = {
  data?: HiringManagerOverview;
  error?: string;
};

export type SessionCreateInput = {
  campaignDocumentId: string;
  name: string;
  candidateLimit: number;
  startsAt?: string | null;
  location?: string | null;
  mode?: "in_person" | "remote" | null;
};

type SessionCreateResponse = {
  data?: HiringManagerSessionListItem;
  error?: string;
};

let campaignsInFlight: Promise<HiringManagerCampaignListItem[]> | null = null;
let campaignsCache: HiringManagerCampaignListItem[] | null = null;
let campaignsFetchedAt = 0;

const campaignDetailsInFlight = new Map<string, Promise<HiringManagerCampaignDetail | null>>();
const campaignDetailsCache = new Map<string, HiringManagerCampaignDetail | null>();

let sessionsInFlight: Promise<HiringManagerSessionListItem[]> | null = null;
let sessionsCache: HiringManagerSessionListItem[] | null = null;
let sessionsFetchedAt = 0;

let overviewInFlight: Promise<HiringManagerOverview> | null = null;
let overviewCache: HiringManagerOverview | null = null;
let overviewFetchedAt = 0;
let lastOverviewForceAt = 0;
const PORTAL_CACHE_TTL_MS = 90_000;
const PORTAL_MIN_REFETCH_MS = 5_000;

function isFresh(timestamp: number) {
  return timestamp > 0 && Date.now() - timestamp < PORTAL_CACHE_TTL_MS;
}

function canForceRefresh(lastForceAt: number) {
  return Date.now() - lastForceAt >= PORTAL_MIN_REFETCH_MS;
}

function hydrateOverviewCaches(overview: HiringManagerOverview) {
  campaignsCache = overview.campaigns;
  sessionsCache = overview.sessions;
  campaignsFetchedAt = Date.now();
  sessionsFetchedAt = campaignsFetchedAt;
  campaignDetailsCache.clear();
  for (const detail of overview.campaignDetails) {
    campaignDetailsCache.set(detail.id, detail);
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Request failed with ${response.status}`);
  }
  return body;
}

export class HiringManagerPortalClientService {
  static async getCampaigns(options?: {
    force?: boolean;
  }): Promise<HiringManagerCampaignListItem[]> {
    if (!options?.force && campaignsCache && isFresh(campaignsFetchedAt)) return campaignsCache;
    if (!options?.force && campaignsInFlight) return campaignsInFlight;

    campaignsInFlight = fetch("/api/hiring-manager/campaigns", {
      cache: "no-store",
    })
      .then((response) => readJson<CampaignsResponse>(response))
      .then((body) => {
        const campaigns = Array.isArray(body.data) ? body.data : [];
        campaignsCache = campaigns;
        campaignsFetchedAt = Date.now();
        return campaigns;
      })
      .finally(() => {
        campaignsInFlight = null;
      });

    return campaignsInFlight;
  }

  static async getCampaignDetail(
    campaignId: string,
    options?: { force?: boolean }
  ): Promise<HiringManagerCampaignDetail | null> {
    if (!options?.force && campaignDetailsCache.has(campaignId) && isFresh(overviewFetchedAt || campaignsFetchedAt)) {
      return campaignDetailsCache.get(campaignId) ?? null;
    }

    const existingRequest = campaignDetailsInFlight.get(campaignId);
    if (!options?.force && existingRequest) return existingRequest;

    const request = fetch(`/api/hiring-manager/campaigns/${campaignId}`, {
      cache: "no-store",
    })
      .then((response) => readJson<CampaignDetailResponse>(response))
      .then((body) => {
        const detail = body.data ?? null;
        campaignDetailsCache.set(campaignId, detail);
        return detail;
      })
      .finally(() => {
        campaignDetailsInFlight.delete(campaignId);
      });

    campaignDetailsInFlight.set(campaignId, request);
    return request;
  }

  static async getCampaignDetails(options?: {
    force?: boolean;
  }): Promise<HiringManagerCampaignDetail[]> {
    const overview = await this.getOverview(options);
    return overview.campaignDetails;
  }

  static async getSessions(options?: {
    force?: boolean;
  }): Promise<HiringManagerSessionListItem[]> {
    if (!options?.force && sessionsCache && isFresh(sessionsFetchedAt)) return sessionsCache;
    if (!options?.force && sessionsInFlight) return sessionsInFlight;

    sessionsInFlight = fetch("/api/hiring-manager/sessions", {
      cache: "no-store",
    })
      .then((response) => readJson<SessionsResponse>(response))
      .then((body) => {
        const sessions = Array.isArray(body.data) ? body.data : [];
        sessionsCache = sessions;
        sessionsFetchedAt = Date.now();
        return sessions;
      })
      .finally(() => {
        sessionsInFlight = null;
      });

    return sessionsInFlight;
  }

  static getCampaignsLastRefresh(): number | null {
    return campaignsFetchedAt || null;
  }

  static getSessionsLastRefresh(): number | null {
    return sessionsFetchedAt || null;
  }

  static async getOverview(options?: {
    force?: boolean;
  }): Promise<HiringManagerOverview> {
    if (
      options?.force &&
      overviewCache &&
      isFresh(overviewFetchedAt) &&
      !canForceRefresh(lastOverviewForceAt)
    ) {
      return overviewCache;
    }
    if (!options?.force && overviewCache && isFresh(overviewFetchedAt)) {
      return overviewCache;
    }
    if (!options?.force && overviewInFlight) return overviewInFlight;

    if (options?.force) lastOverviewForceAt = Date.now();

    overviewInFlight = fetch("/api/hiring-manager/overview", {
      cache: "no-store",
    })
      .then((response) => readJson<OverviewResponse>(response))
      .then((body) => {
        const overview = body.data ?? { campaigns: [], campaignDetails: [], sessions: [] };
        overviewCache = overview;
        overviewFetchedAt = Date.now();
        hydrateOverviewCaches(overview);
        return overview;
      })
      .finally(() => {
        overviewInFlight = null;
      });

    return overviewInFlight;
  }

  static invalidate() {
    campaignsInFlight = null;
    campaignsCache = null;
    campaignsFetchedAt = 0;
    campaignDetailsInFlight.clear();
    campaignDetailsCache.clear();
    sessionsInFlight = null;
    sessionsCache = null;
    sessionsFetchedAt = 0;
    overviewInFlight = null;
    overviewCache = null;
    overviewFetchedAt = 0;
  }

  static async createSession(
    input: SessionCreateInput
  ): Promise<HiringManagerSessionListItem | null> {
    const response = await fetch("/api/hiring-manager/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await readJson<SessionCreateResponse>(response);

    sessionsInFlight = null;
    sessionsCache = null;
    sessionsFetchedAt = 0;
    campaignsInFlight = null;
    campaignsCache = null;
    campaignsFetchedAt = 0;
    campaignDetailsInFlight.clear();
    campaignDetailsCache.clear();
    overviewInFlight = null;
    overviewCache = null;
    overviewFetchedAt = 0;

    return body.data ?? null;
  }

  static async removeCandidateFromSession(input: {
    sessionId: string;
    candidateSessionId: string;
    reason: string;
  }): Promise<void> {
    const response = await fetch(
      `/api/hiring-manager/sessions/${input.sessionId}/candidates/${input.candidateSessionId}/remove`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: input.reason }),
      }
    );
    await readJson<{ data?: unknown; error?: string }>(response);

    sessionsInFlight = null;
    sessionsCache = null;
    sessionsFetchedAt = 0;
    overviewInFlight = null;
    overviewCache = null;
    overviewFetchedAt = 0;
  }

  static async deleteCampaign(campaignId: string): Promise<void> {
    const response = await fetch(`/api/hiring-manager/campaigns/${campaignId}`, {
      method: "DELETE",
    });
    await readJson<{ data?: unknown; error?: string }>(response);
    this.invalidate();
  }

  static async unlockCandidate(candidateSessionId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `/api/hiring-manager/candidate-sessions/${candidateSessionId}/unlock`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      await readJson<{ data?: unknown; error?: string }>(response);
      this.invalidate();
      return true;
    } catch (err) {
      console.error("[unlockCandidate] Failed to unlock candidate", err);
      return false;
    }
  }

  static async inviteCandidates(
    campaignId: string,
    emails: string[],
    options?: { mode?: "remote" | "in_person" }
  ): Promise<{ sent: string[]; failed: string[] }> {
    const response = await fetch(
      `/api/hiring-manager/campaigns/${campaignId}/invite-candidates`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails, mode: options?.mode }),
      }
    );
    const body = await readJson<{
      data?: { sent?: string[]; failed?: string[] };
      error?: string;
    }>(response);

    this.invalidate();
    return {
      sent: body.data?.sent ?? [],
      failed: body.data?.failed ?? [],
    };
  }

  static async updateSessionStatus(
    sessionId: string,
    status: "closed"
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/hiring-manager/sessions/${sessionId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await readJson<{ data?: unknown; error?: string }>(response);
      this.invalidate();
      return true;
    } catch (err) {
      console.error("[updateSessionStatus] Failed to update session status", err);
      return false;
    }
  }
}
