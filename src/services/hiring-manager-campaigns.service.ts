import "server-only";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");
const stripLeadingSlashes = (value: string) => value.replace(/^\/+/, "");

function getStrapiBaseUrl() {
  return stripTrailingSlashes(
    process.env.STRAPI_API_URL ??
      process.env.NEXT_PUBLIC_STRAPI_API_URL ??
      "http://localhost:1337/api"
  );
}

async function getJwt() {
  const session = await getServerSession(authOptions);
  return session?.user?.jwt ?? null;
}

class StrapiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "StrapiRequestError";
    this.status = status;
  }
}

export async function strapiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const jwt = await getJwt();
  if (!jwt) {
    throw new Error("Authentication required");
  }

  const response = await fetch(
    `${getStrapiBaseUrl()}/${stripLeadingSlashes(path)}`,
    {
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
        ...init?.headers,
      },
    }
  );

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body?.error?.message || body?.error || `Strapi responded ${response.status}`;
    throw new StrapiRequestError(message, response.status);
  }

  return body as T;
}

export function getStrapiErrorStatus(error: unknown) {
  return error instanceof StrapiRequestError ? error.status : null;
}

type StrapiListResponse<T> = {
  data?: T[];
};

type StrapiSingleResponse<T> = {
  data?: T;
};

type RawAssessment = {
  documentId?: string;
  displayName?: string;
  slug?: string;
};

type RawAssessmentResult = {
  documentId?: string;
  score?: number | string | null;
  passed?: boolean | null;
  assessmentStatus?: string;
  completedAt?: string | null;
  wpm?: number | string | null;
  accuracy?: number | string | null;
  mistakeCount?: number | string | null;
  durationSeconds?: number | string | null;
  metrics?: Record<string, unknown> | null;
  rawData?: Record<string, any> | null;
  assessment?: RawAssessment;
};

type RawCandidateSession = {
  id?: number;
  documentId?: string;
  candidateCode?: string;
  mode?: "in_person" | "remote";
  sessionStatus?: "pending" | "active" | "completed" | "locked" | "expired";
  expiresAt?: string | null;
  usedAt?: string | null;
  completedAt?: string | null;
  removedAt?: string | null;
  removalReason?: string | null;
  createdAt?: string;
  users_permissions_users?: Array<{
    documentId?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  }>;
  assessment_results?: RawAssessmentResult[];
};

type RawAssessmentSession = {
  id?: number;
  documentId?: string;
  name?: string;
  sessionCode?: string;
  candidateLimit?: number;
  sessionStatus?: "ready" | "closed" | "cancelled";
  startsAt?: string | null;
  location?: string | null;
  mode?: "in_person" | "remote" | null;
  campaign?: RawCampaign;
  candidate_sessions?: RawCandidateSession[];
};

type RawCampaign = {
  id?: number;
  documentId?: string;
  name?: string;
  jobRole?: string;
  campaignStatus?: "draft" | "configured" | "live" | "closed" | "archived";
  approvalStatus?: "pending" | "approved" | "rejected";
  assessmentMode?: "in_person" | "remote" | "hybrid";
  startDate?: string | null;
  endDate?: string | null;
  vacancyCount?: number | null;
  location?: string | null;
  assessments?: RawAssessment[];
  assessmentSettings?: Record<string, unknown> | null;
  candidate_sessions?: RawCandidateSession[];
  assessment_sessions?: RawAssessmentSession[];
};

export type HiringManagerCampaignCreateInput = {
  name: string;
  jobRole: string;
  campaignType?: string;
  startDate: string;
  endDate?: string | null;
  isOngoing?: boolean;
  vacancyCount: number;
  location?: string;
  assessmentMode: "in_person" | "remote" | "hybrid";
  assessmentDocumentIds: string[];
  assessmentSettings?: Record<string, unknown>;
};

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
    sessionName?: string;
    campaignId?: string;
    campaignName?: string;
    assessmentStack?: string[];
    results: HiringManagerAssessmentResult[];
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

export type HiringManagerCampaignCreateResult = {
  campaign: HiringManagerCampaignListItem;
};

export type HiringManagerAssessmentSessionCreateInput = {
  campaignDocumentId: string;
  name: string;
  candidateLimit: number;
  startsAt?: string | null;
  location?: string | null;
  mode?: "in_person" | "remote" | null;
};

function formatStatus(status?: RawCampaign["campaignStatus"]): HiringManagerCampaignListItem["status"] {
  switch (status) {
    case "live":
      return "Live";
    case "closed":
      return "Closed";
    case "archived":
      return "Archived";
    case "configured":
      return "Configured";
    case "draft":
    default:
      return "Draft";
  }
}

function formatApprovalStatus(
  status?: RawCampaign["approvalStatus"]
): HiringManagerCampaignListItem["approvalStatus"] {
  switch (status) {
    case "pending":
      return "Pending approval";
    case "rejected":
      return "Rejected";
    case "approved":
    default:
      return "Approved";
  }
}

function formatMode(mode?: RawCampaign["assessmentMode"] | RawCandidateSession["mode"]) {
  switch (mode) {
    case "remote":
      return "Remote";
    case "hybrid":
      return "Hybrid";
    case "in_person":
    default:
      return "In-person";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function numberOrNull(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function computeFallbackTypingScore(result: RawAssessmentResult) {
  const wpm = numberOrNull(result.wpm);
  const accuracy = numberOrNull(result.accuracy);
  if (wpm === null || accuracy === null) return null;
  const normalisedWpm = Math.min(Math.round((wpm / 60) * 100), 100);
  return Math.round((normalisedWpm + accuracy) / 2);
}

function normalizeAssessmentResult(
  result: RawAssessmentResult,
  candidateSessionId?: string
): HiringManagerAssessmentResult {
  const numericScore =
    numberOrNull(result.score) ?? computeFallbackTypingScore(result);
  const wpm = numberOrNull(result.wpm);
  const accuracy = numberOrNull(result.accuracy);

  return {
    id:
      result.documentId ??
      `${candidateSessionId ?? "candidate"}-${result.assessment?.slug ?? "result"}`,
    assessment:
      result.assessment?.displayName || result.assessment?.slug || "Assessment",
    score: numericScore === null ? "Pending" : `${Math.round(numericScore)}%`,
    numericScore,
    passed:
      result.passed ??
      (wpm !== null && accuracy !== null ? wpm >= 32 && accuracy >= 90 : null),
    completedAt: result.completedAt,
    wpm,
    accuracy,
    mistakeCount: numberOrNull(result.mistakeCount),
    durationSeconds: numberOrNull(result.durationSeconds),
    metrics: result.metrics ?? null,
    rawData: result.rawData ?? null,
  };
}

function normalizeAssessmentSession(session: RawAssessmentSession): HiringManagerSessionListItem {
  const status = (() => {
    if (session.sessionStatus === "closed") return "Closed";
    if (session.sessionStatus === "cancelled") return "Cancelled";

    const startsAtTime = session.startsAt ? new Date(session.startsAt).getTime() : 0;
    const isPastStart = startsAtTime > 0 && Date.now() >= startsAtTime;
    return isPastStart ? "Live" : "Upcoming";
  })();
  const candidates = (session.candidate_sessions ?? []).filter(
    (candidateSession) => candidateSession.sessionStatus !== "expired" && !candidateSession.removedAt
  );

  return {
    id: session.documentId ?? String(session.id ?? session.sessionCode ?? "session"),
    documentId: session.documentId,
    campaign: session.campaign?.name ?? "Untitled campaign",
    type: (session.mode === "remote" ? "Remote" : "In-person") as "In-person" | "Remote",
    status,
    date: formatDate(session.startsAt ?? session.campaign?.startDate),
    startsAt: session.startsAt ?? session.campaign?.startDate ?? null,
    location: session.location || session.campaign?.location || "Location to confirm",
    candidateCount: candidates.length,
    candidateLimit: session.candidateLimit ?? 0,
    accessMode: "Session Code",
    accessValue: session.sessionCode || "Generated by backend",
    candidates: candidates.map((candidateSession) => {
      const user = candidateSession.users_permissions_users?.[0];
      const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
      const results = (candidateSession.assessment_results ?? []).map((result) =>
        normalizeAssessmentResult(result, candidateSession.documentId)
      );
      return {
        id: candidateSession.documentId ?? String(candidateSession.id ?? candidateSession.candidateCode),
        name: name || user?.email || candidateSession.candidateCode || "Candidate",
        email: user?.email,
        status: candidateSession.sessionStatus,
        hasStartedAssessment:
          results.length > 0 ||
          candidateSession.sessionStatus === "completed" ||
          candidateSession.sessionStatus === "locked",
        results,
      };
    }),
  };
}

function getCampaignCandidateSessions(campaign: RawCampaign) {
  const byId = new Map<string, RawCandidateSession>();

  for (const session of campaign.candidate_sessions ?? []) {
    const key = session.documentId ?? String(session.id ?? session.candidateCode ?? byId.size);
    byId.set(key, session);
  }

  for (const assessmentSession of campaign.assessment_sessions ?? []) {
    for (const session of assessmentSession.candidate_sessions ?? []) {
      const key = session.documentId ?? String(session.id ?? session.candidateCode ?? byId.size);
      byId.set(key, session);
    }
  }

  return Array.from(byId.values()).filter(
    (session) => session.sessionStatus !== "expired" && !session.removedAt
  );
}

function normalizeCampaign(campaign: RawCampaign): HiringManagerCampaignListItem {
  const assessmentStack = (campaign.assessments ?? []).map(
    (assessment) => assessment.displayName || assessment.slug || "Assessment"
  );
  const candidateSessions = getCampaignCandidateSessions(campaign);

  return {
    id: campaign.documentId ?? String(campaign.id ?? campaign.name ?? "campaign"),
    documentId: campaign.documentId,
    name: campaign.name ?? "Untitled campaign",
    role: campaign.jobRole ?? "Role not set",
    status: formatStatus(campaign.campaignStatus),
    approvalStatus: formatApprovalStatus(campaign.approvalStatus),
    deliveryMode: formatMode(campaign.assessmentMode) as "In-person" | "Remote" | "Hybrid",
    candidateCount: campaign.vacancyCount ?? candidateSessions.length,
    sessions: campaign.assessment_sessions?.length ?? 0,
    assessmentStack,
    assessmentSettings: campaign.assessmentSettings ?? null,
    nextMilestone:
      campaign.assessment_sessions?.length
        ? `${campaign.assessment_sessions.length} Session${campaign.assessment_sessions.length === 1 ? "" : "s"} created`
        : campaign.approvalStatus === "pending"
          ? "Awaiting client approval"
          : campaign.approvalStatus === "rejected"
            ? "Client rejected campaign"
            : "Create a session",
  };
}

function normalizeCampaignDetail(campaign: RawCampaign): HiringManagerCampaignDetail {
  const base = normalizeCampaign(campaign);
  const assessmentSessions = (campaign.assessment_sessions ?? []).map((session) =>
    normalizeAssessmentSession({
      ...session,
      campaign,
    })
  );

  return {
    ...base,
    startDate: formatDate(campaign.startDate),
    endDate: campaign.endDate ? formatDate(campaign.endDate) : "Not set",
    location: campaign.location || "Location to confirm",
    assessmentSessions,
    joinedCandidates: assessmentSessions.flatMap((session) =>
      session.candidates.map((candidate) => ({
        ...candidate,
        sessionName: session.accessValue,
        campaignId: base.id,
        campaignName: base.name,
        assessmentStack: base.assessmentStack,
      }))
    ),
  };
}

export async function getHiringManagerCampaigns(): Promise<{
  campaigns: HiringManagerCampaignListItem[];
  error: string | null;
}> {
  try {
    const response = await strapiRequest<StrapiListResponse<RawCampaign>>(
      "/hiring-manager/campaigns"
    );

    return {
      campaigns: (response.data ?? []).map(normalizeCampaign),
      error: null,
    };
  } catch (error) {
    console.error("[getHiringManagerCampaigns] Failed to load campaigns", error);
    return {
      campaigns: [],
      error:
        error instanceof Error
          ? error.message
          : "Hiring Manager campaigns could not be loaded.",
    };
  }
}

export async function getHiringManagerCampaignDetail(
  campaignDocumentId: string
): Promise<{
  campaign: HiringManagerCampaignDetail | null;
  error: string | null;
}> {
  try {
    const response = await strapiRequest<StrapiSingleResponse<RawCampaign>>(
      `/hiring-manager/campaigns/${campaignDocumentId}`
    );

    return {
      campaign: normalizeCampaignDetail(response.data ?? {}),
      error: null,
    };
  } catch (error) {
    console.error("[getHiringManagerCampaignDetail] Failed to load campaign", error);
    return {
      campaign: null,
      error:
        error instanceof Error
          ? error.message
          : "Hiring Manager campaign could not be loaded.",
    };
  }
}

export async function getHiringManagerSessions(): Promise<{
  sessions: HiringManagerSessionListItem[];
  error: string | null;
}> {
  try {
    const response = await strapiRequest<StrapiListResponse<RawAssessmentSession>>(
      "/hiring-manager/assessment-sessions"
    );
    const sessions = (response.data ?? []).map(normalizeAssessmentSession);

    return { sessions, error: null };
  } catch (error) {
    console.error("[getHiringManagerSessions] Failed to load sessions", error);
    return {
      sessions: [],
      error:
        error instanceof Error
          ? error.message
          : "Hiring Manager sessions could not be loaded.",
    };
  }
}

export async function getHiringManagerOverview(): Promise<{
  campaigns: HiringManagerCampaignListItem[];
  campaignDetails: HiringManagerCampaignDetail[];
  sessions: HiringManagerSessionListItem[];
  error: string | null;
}> {
  const campaignsResult = await getHiringManagerCampaigns();
  const [detailsResults, sessionsResult] = await Promise.all([
    Promise.all(
      campaignsResult.campaigns.map((campaign) =>
        getHiringManagerCampaignDetail(campaign.id)
      )
    ),
    getHiringManagerSessions(),
  ]);

  return {
    campaigns: campaignsResult.campaigns,
    campaignDetails: detailsResults
      .map((result) => result.campaign)
      .filter(Boolean) as HiringManagerCampaignDetail[],
    sessions: sessionsResult.sessions,
    error: campaignsResult.error ?? sessionsResult.error ?? detailsResults.find((result) => result.error)?.error ?? null,
  };
}

export async function createHiringManagerCampaign(
  input: HiringManagerCampaignCreateInput
): Promise<HiringManagerCampaignCreateResult> {
  const response = await strapiRequest<StrapiSingleResponse<RawCampaign>>(
    "/hiring-manager/campaigns",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
  const campaign = response.data ?? {};

  return {
    campaign: normalizeCampaign(campaign),
  };
}

export async function createHiringManagerAssessmentSession(
  input: HiringManagerAssessmentSessionCreateInput
): Promise<HiringManagerSessionListItem> {
  const response = await strapiRequest<StrapiSingleResponse<RawAssessmentSession>>(
    `/campaigns/${input.campaignDocumentId}/assessment-sessions`,
    {
      method: "POST",
      body: JSON.stringify({
        name: input.name,
        candidateLimit: input.candidateLimit,
        startsAt: input.startsAt,
        location: input.location,
        mode: input.mode,
      }),
    }
  );

  return normalizeAssessmentSession(response.data ?? {});
}

export async function removeCandidateFromAssessmentSession(
  assessmentSessionDocumentId: string,
  candidateSessionDocumentId: string,
  reason: string
): Promise<void> {
  await strapiRequest<StrapiSingleResponse<unknown>>(
    `/assessment-sessions/${assessmentSessionDocumentId}/candidates/${candidateSessionDocumentId}/remove`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    }
  );
}

export async function deleteHiringManagerCampaign(campaignDocumentId: string): Promise<void> {
  await strapiRequest<StrapiSingleResponse<unknown>>(
    `/hiring-manager/campaigns/${campaignDocumentId}`,
    {
      method: "DELETE",
    }
  );
}
