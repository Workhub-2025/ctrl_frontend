import {
  fetchPortalJson,
  getPortalCacheUpdatedAt,
  invalidatePortalCache,
  PORTAL_CACHE_TTL_MS,
  PORTAL_MIN_REFETCH_MS,
} from "@/lib/portal-fetch-cache";
import type {
  HiringManagerAssessmentResult,
  HiringManagerCampaignDetail,
  HiringManagerCampaignListItem,
  HiringManagerCandidateReport,
  HiringManagerSessionListItem,
} from "@/types/hiring-manager.types";

export type {
  HiringManagerAssessmentResult,
  HiringManagerCampaignDetail,
  HiringManagerCampaignListItem,
  HiringManagerCandidateReport,
  HiringManagerResolvedStackItem,
  HiringManagerResolvedStackSummary,
  HiringManagerSessionListItem,
} from "@/types/hiring-manager.types";

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

type CandidateReportResponse = {
  data?: HiringManagerCandidateReport;
  error?: string;
};

const HM_OVERVIEW_CACHE_KEY = "hm:overview";

const EMPTY_OVERVIEW: HiringManagerOverview = {
  campaigns: [],
  campaignDetails: [],
  sessions: [],
};

let campaignsInFlight: Promise<HiringManagerCampaignListItem[]> | null = null;
let campaignsCache: HiringManagerCampaignListItem[] | null = null;
let campaignsFetchedAt = 0;

const campaignDetailsInFlight = new Map<string, Promise<HiringManagerCampaignDetail | null>>();
const campaignDetailsCache = new Map<string, HiringManagerCampaignDetail | null>();

let sessionsInFlight: Promise<HiringManagerSessionListItem[]> | null = null;
let sessionsCache: HiringManagerSessionListItem[] | null = null;
let sessionsFetchedAt = 0;

let lastOverviewForceAt = 0;

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
    if (
      !options?.force &&
      campaignDetailsCache.has(campaignId) &&
      isFresh(getPortalCacheUpdatedAt(HM_OVERVIEW_CACHE_KEY) ?? campaignsFetchedAt)
    ) {
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

  static async getCandidateReport(
    candidateSessionId: string
  ): Promise<HiringManagerCandidateReport> {
    const response = await fetch(
      `/api/hiring-manager/candidate-sessions/${encodeURIComponent(candidateSessionId)}/report`,
      { cache: "no-store" }
    );
    const body = await readJson<CandidateReportResponse>(response);
    if (!body.data) {
      throw new Error("Candidate report could not be found.");
    }
    return body.data;
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
    return getPortalCacheUpdatedAt(HM_OVERVIEW_CACHE_KEY) ?? (campaignsFetchedAt || null);
  }

  static getSessionsLastRefresh(): number | null {
    return getPortalCacheUpdatedAt(HM_OVERVIEW_CACHE_KEY) ?? (sessionsFetchedAt || null);
  }

  static async getOverview(options?: {
    force?: boolean;
  }): Promise<HiringManagerOverview> {
    if (options?.force) {
      lastOverviewForceAt = Date.now();
    }

    const overview = await fetchPortalJson<HiringManagerOverview>({
      key: HM_OVERVIEW_CACHE_KEY,
      url: "/api/hiring-manager/overview",
      fallback: EMPTY_OVERVIEW,
      force: options?.force,
      minRefetchMs: PORTAL_MIN_REFETCH_MS,
      allowEmpty: true,
      transform: (body) => {
        const record = body as OverviewResponse;
        return record.data ?? EMPTY_OVERVIEW;
      },
    });

    hydrateOverviewCaches(overview);
    return overview;
  }

  static invalidate() {
    invalidatePortalCache(HM_OVERVIEW_CACHE_KEY);
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
    invalidatePortalCache(HM_OVERVIEW_CACHE_KEY);

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
    invalidatePortalCache(HM_OVERVIEW_CACHE_KEY);
  }

  static async deleteSession(sessionId: string): Promise<void> {
    const response = await fetch(`/api/hiring-manager/sessions/${sessionId}`, {
      method: "DELETE",
    });
    await readJson<{ data?: unknown; error?: string }>(response);
    this.invalidate();
  }

  static async deleteCampaign(campaignId: string): Promise<void> {
    const response = await fetch(`/api/hiring-manager/campaigns/${campaignId}`, {
      method: "DELETE",
    });
    await readJson<{ data?: unknown; error?: string }>(response);
    this.invalidate();
  }

  static async unlockCandidate(candidateSessionId: string): Promise<void> {
    const response = await fetch(
      `/api/hiring-manager/candidate-sessions/${candidateSessionId}/unlock`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );
    await readJson<{ data?: unknown; error?: string }>(response);
    this.invalidate();
  }

  static async submitCandidateDecision(input: {
    candidateSessionId: string;
    decision: "approve" | "reject";
    note?: string;
  }): Promise<{ hmDecision: "approved" | "rejected" }> {
    const response = await fetch(
      `/api/hiring-manager/candidate-sessions/${encodeURIComponent(input.candidateSessionId)}/decision`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: input.decision,
          note: input.note,
        }),
      }
    );
    const body = await readJson<{
      data?: { hmDecision?: "approved" | "rejected" };
      error?: string;
    }>(response);

    this.invalidate();

    return {
      hmDecision: body.data?.hmDecision ?? (input.decision === "approve" ? "approved" : "rejected"),
    };
  }

  static async inviteCandidatesToSession(
    sessionId: string,
    emails: string[]
  ): Promise<{ sent: string[]; failed: string[] }> {
    const response = await fetch(
      `/api/hiring-manager/sessions/${sessionId}/invite-candidates`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
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

  static async resendCandidateInvite(candidateSessionId: string): Promise<void> {
    const response = await fetch(
      `/api/hiring-manager/candidate-sessions/${encodeURIComponent(candidateSessionId)}/resend`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }
    );
    await readJson<{ data?: unknown; error?: string }>(response);
    this.invalidate();
  }
}
