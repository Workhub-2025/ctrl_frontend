export type HiringManagerCampaignListItem = {
  id: string;
  documentId?: string;
  name: string;
  role: string;
  status: "Live" | "Configured" | "Draft" | "Closed" | "Archived";
  deliveryMode: "In-person" | "Remote" | "Hybrid";
  completion: number;
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
    sessionName?: string;
    campaignId?: string;
    campaignName?: string;
    assessmentStack?: string[];
    results?: HiringManagerAssessmentResult[];
  }>;
};

export type HiringManagerSessionListItem = {
  id: string;
  documentId?: string;
  campaign: string;
  type: "In-person" | "Remote";
  status: "Ready to issue" | "Live" | "Closed" | "Cancelled";
  date: string;
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

type SessionCreateInput = {
  campaignDocumentId: string;
  name: string;
  candidateLimit: number;
  startsAt?: string | null;
  location?: string | null;
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
    if (!options?.force && campaignsCache) return campaignsCache;
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
    if (!options?.force && campaignDetailsCache.has(campaignId)) {
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
    const campaignList = await this.getCampaigns(options);
    const details = await Promise.all(
      campaignList.map((campaign) =>
        this.getCampaignDetail(campaign.id, options)
      )
    );
    return details.filter(Boolean) as HiringManagerCampaignDetail[];
  }

  static async getSessions(options?: {
    force?: boolean;
  }): Promise<HiringManagerSessionListItem[]> {
    if (!options?.force && sessionsCache) return sessionsCache;
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

  static invalidate() {
    campaignsInFlight = null;
    campaignsCache = null;
    campaignsFetchedAt = 0;
    campaignDetailsInFlight.clear();
    campaignDetailsCache.clear();
    sessionsInFlight = null;
    sessionsCache = null;
    sessionsFetchedAt = 0;
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
  }

  static async deleteCampaign(campaignId: string): Promise<void> {
    const response = await fetch(`/api/hiring-manager/campaigns/${campaignId}`, {
      method: "DELETE",
    });
    await readJson<{ data?: unknown; error?: string }>(response);
    this.invalidate();
  }
}
