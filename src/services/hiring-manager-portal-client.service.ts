import {
  getPortalCacheUpdatedAt,
  invalidatePortalCache,
  PORTAL_CACHE_TTL_MS,
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

type CampaignDetailResponse = {
  data?: HiringManagerCampaignDetail;
  error?: string;
};

type HiringManagerOverview = {
  campaigns: HiringManagerCampaignListItem[];
  campaignDetails: HiringManagerCampaignDetail[];
  sessions: HiringManagerSessionListItem[];
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

let overviewSyncedAt = 0;

const campaignDetailsInFlight = new Map<string, Promise<HiringManagerCampaignDetail | null>>();
const campaignDetailsCache = new Map<string, HiringManagerCampaignDetail | null>();

function isFresh(timestamp: number) {
  return timestamp > 0 && Date.now() - timestamp < PORTAL_CACHE_TTL_MS;
}

function hydrateOverviewCaches(overview: HiringManagerOverview) {
  overviewSyncedAt = Date.now();
  campaignDetailsCache.clear();
  for (const detail of overview.campaignDetails) {
    campaignDetailsCache.set(detail.id, detail);
  }
}

/** Keep campaign-detail cache aligned after overview loads via the portal hook. */
export function syncHiringManagerOverviewCache(overview: HiringManagerOverview) {
  hydrateOverviewCaches(overview);
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || `Request failed with ${response.status}`);
  }
  return body;
}

export class HiringManagerPortalClientService {
  static async getCampaignDetail(
    campaignId: string,
    options?: { force?: boolean }
  ): Promise<HiringManagerCampaignDetail | null> {
    if (
      !options?.force &&
      campaignDetailsCache.has(campaignId) &&
      isFresh(getPortalCacheUpdatedAt(HM_OVERVIEW_CACHE_KEY) ?? overviewSyncedAt)
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

  static invalidate() {
    invalidatePortalCache(HM_OVERVIEW_CACHE_KEY);
    overviewSyncedAt = 0;
    campaignDetailsInFlight.clear();
    campaignDetailsCache.clear();
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

    this.invalidate();

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

    this.invalidate();
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

  static async generateOfflineCodes(
    sessionId: string,
    count: number
  ): Promise<Array<Record<string, unknown>>> {
    const response = await fetch(
      `/api/hiring-manager/sessions/${sessionId}/generate-offline-codes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      }
    );
    if (!response.ok) {
      const body = await readJson<{ error?: string }>(response);
      throw new Error(body.error || "Offline codes could not be generated.");
    }
    const body = await readJson<{
      data?: Array<Record<string, unknown>>;
      error?: string;
    }>(response);

    this.invalidate();
    return body.data ?? [];
  }
}
