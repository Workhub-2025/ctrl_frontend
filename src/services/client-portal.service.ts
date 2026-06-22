import "server-only";

import {
  strapiRequest,
  type HiringManagerCampaignListItem,
} from "@/services/hiring-manager-campaigns.service";

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

type RawUser = {
  documentId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type RawCampaign = {
  id?: number;
  documentId?: string;
  name?: string;
  jobRole?: string;
  campaignStatus?: "draft" | "configured" | "live" | "closed" | "archived";
  approvalStatus?: "pending" | "approved" | "rejected";
  assessmentMode?: "in_person" | "remote" | "hybrid";
  vacancyCount?: number | null;
  assessmentSettings?: Record<string, unknown> | null;
  createdAt?: string;
  approvalNote?: string | null;
  assessments?: RawAssessment[];
  users_permissions_users?: RawUser[];
  assessment_sessions?: unknown[];
  candidate_sessions?: unknown[];
};

export type ClientCampaignApprovalItem = HiringManagerCampaignListItem & {
  createdAt?: string;
  createdBy: string;
  approvalNote?: string | null;
};

export type ClientDashboardSummary = {
  client?: {
    documentId?: string;
    name?: string;
    campaignApprovalMode?: "auto_approve" | "require_approval";
    features?: Record<string, unknown> | null;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
  };
  seats: {
    limit: number;
    used: number;
    available: number;
  };
  availableAccessCodes: number;
  candidatesPendingReview: number;
  campaignsPendingApproval: number;
  activeContract?: ClientContract | null;
};

export type ClientContract = {
  documentId?: string;
  seatCount?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  tier?: string;
  minimumContractedSeats?: number;
  notes?: string | null;
};

export type ClientSharedCandidate = {
  documentId: string;
  reviewStatus: "pending_review" | "reviewed" | "progressed" | "rejected";
  sharedAt?: string | null;
  candidateName: string;
  candidateEmail?: string;
  hiringManagerName: string;
  campaignName: string;
  role: string;
};

export type ClientOutreachTemplateKey = "inperson" | "phone";

export type ClientOutreachTemplatePrefill = {
  subject: string;
  body: string;
};

export type ClientOutreachTemplates = Record<
  ClientOutreachTemplateKey,
  ClientOutreachTemplatePrefill
>;

export type ClientAccessCode = {
  documentId: string;
  code?: string;
  expiresAt: string;
  status: string;
  targetRole: string;
  createdAt?: string;
  updatedAt?: string;
  invitedEmail?: string | null;
  seatNumber?: number | null;
  seatLabel?: string | null;
};

export type ClientHiringManagerSeat = {
  documentId: string;
  name: string;
  email: string;
  status: "active" | "previous";
  createdAt?: string;
  seatNumber?: number | null;
  seatLabel?: string | null;
  accessCodeDocumentId?: string | null;
  candidatesOnboarded: number;
  campaigns: Array<{
    documentId: string;
    name: string;
    jobRole: string;
    campaignStatus: string;
    approvalStatus: string;
    candidatesOnboarded: number;
  }>;
};

export type ClientOverviewData = {
  summary: ClientDashboardSummary | null;
  campaigns: ClientCampaignApprovalItem[];
  accessCodes: ClientAccessCode[];
  hiringManagers: ClientHiringManagerSeat[];
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

function formatMode(mode?: RawCampaign["assessmentMode"]) {
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

function formatApprovalStatus(status?: RawCampaign["approvalStatus"]) {
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

function normalizeCampaign(campaign: RawCampaign): ClientCampaignApprovalItem {
  const createdByUser = campaign.users_permissions_users?.[0];
  const createdBy = [createdByUser?.firstName, createdByUser?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const candidateSessions = campaign.candidate_sessions ?? [];
  const assessmentSessions = campaign.assessment_sessions ?? [];
  const assessmentStack = (campaign.assessments ?? []).map(
    (assessment) => assessment.displayName || assessment.slug || "Assessment"
  );

  return {
    id: campaign.documentId ?? String(campaign.id ?? campaign.name ?? "campaign"),
    documentId: campaign.documentId,
    name: campaign.name ?? "Untitled campaign",
    role: campaign.jobRole ?? "Role not set",
    status: formatStatus(campaign.campaignStatus),
    approvalStatus: formatApprovalStatus(campaign.approvalStatus),
    deliveryMode: formatMode(campaign.assessmentMode) as "In-person" | "Remote" | "Hybrid",
    candidateCount: campaign.vacancyCount ?? candidateSessions.length,
    sessions: assessmentSessions.length,
    assessmentStack,
    assessmentSettings: campaign.assessmentSettings ?? null,
    nextMilestone:
      campaign.approvalStatus === "pending"
        ? "Approve before sessions can be created"
        : campaign.approvalStatus === "rejected"
          ? "Rejected by client"
          : "Approved",
    createdAt: campaign.createdAt,
    createdBy: createdBy || createdByUser?.email || "Hiring manager",
    approvalNote: campaign.approvalNote ?? null,
  };
}

export async function getClientCampaignApprovals(status?: "pending" | "approved" | "rejected") {
  const query = status ? `?status=${status}` : "";
  const response = await strapiRequest<StrapiListResponse<RawCampaign>>(
    `/client/campaign-approvals${query}`
  );

  return (response.data ?? []).map(normalizeCampaign);
}

export async function getClientDashboardSummary() {
  const response = await strapiRequest<{ data?: ClientDashboardSummary }>(
    "/client/dashboard"
  );

  return response.data;
}

export async function updateClientCampaignApprovalMode(
  clientDocumentId: string,
  mode: "auto_approve" | "require_approval"
) {
  if (!clientDocumentId) {
    throw new Error("Client account could not be resolved");
  }

  const response = await strapiRequest<StrapiSingleResponse<ClientDashboardSummary["client"]>>(
    `/clients/${encodeURIComponent(clientDocumentId)}/approval-mode`,
    {
      method: "POST",
      body: JSON.stringify({ mode }),
    }
  );

  return response.data;
}

export async function updateClientAutoRenew(
  clientDocumentId: string,
  autoRenew: boolean
) {
  if (!clientDocumentId) {
    throw new Error("Client account could not be resolved");
  }

  const response = await strapiRequest<StrapiSingleResponse<any>>(
    `/clients/${encodeURIComponent(clientDocumentId)}/auto-renew`,
    {
      method: "POST",
      body: JSON.stringify({ autoRenew }),
    }
  );

  return response.data;
}

export async function getClientOverview(): Promise<ClientOverviewData> {
  const summary = await getClientDashboardSummary();
  const clientDocumentId = summary?.client?.documentId;

  if (!clientDocumentId) {
    throw new Error("Client account could not be resolved");
  }

  const [campaigns, accessCodes, hiringManagers] = await Promise.all([
    getClientCampaignApprovals(),
    getClientAccessCodes(),
    getClientHiringManagers(clientDocumentId),
  ]);

  return {
    summary: summary ?? null,
    campaigns,
    accessCodes,
    hiringManagers,
  };
}

export async function reviewClientCampaign(input: {
  campaignDocumentId: string;
  decision: "approved" | "rejected";
  note?: string;
}) {
  const response = await strapiRequest<StrapiSingleResponse<RawCampaign>>(
    `/client/campaign-approvals/${input.campaignDocumentId}/review`,
    {
      method: "POST",
      body: JSON.stringify({
        decision: input.decision,
        note: input.note,
      }),
    }
  );

  return normalizeCampaign(response.data ?? {});
}

export async function getClientAccessCodes() {
  const response = await strapiRequest<{ data?: ClientAccessCode[] }>(
    "/access-codes"
  );

  return response.data ?? [];
}

export async function generateHiringManagerAccessCode(input?: {
  seatNumber?: number;
  seatLabel?: string;
}) {
  const response = await strapiRequest<{ data?: ClientAccessCode }>(
    "/access-codes/generate",
    {
      method: "POST",
      body: JSON.stringify({
        seatNumber: input?.seatNumber,
        seatLabel: input?.seatLabel,
      }),
    }
  );

  return response.data;
}

export async function refreshHiringManagerAccessCode(
  refreshCodeDocumentId: string,
  input?: {
    seatNumber?: number;
    seatLabel?: string;
  }
) {
  const response = await strapiRequest<{ data?: ClientAccessCode }>(
    "/access-codes/generate",
    {
      method: "POST",
      body: JSON.stringify({
        refreshCodeDocumentId,
        seatNumber: input?.seatNumber,
        seatLabel: input?.seatLabel,
      }),
    }
  );

  return response.data;
}

export async function inviteHiringManagerByEmail(input: {
  clientDocumentId: string;
  email: string;
  accessCodeDocumentId?: string;
  seatNumber?: number;
  seatLabel?: string;
}) {
  const response = await strapiRequest<{ data?: ClientAccessCode & { invitedEmail?: string } }>(
    `/clients/${encodeURIComponent(input.clientDocumentId)}/hiring-manager-invites`,
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        accessCodeDocumentId: input.accessCodeDocumentId,
        seatNumber: input.seatNumber,
        seatLabel: input.seatLabel,
      }),
    }
  );

  return response.data;
}

export async function getClientHiringManagers(clientDocumentId: string) {
  const response = await strapiRequest<{ data?: Array<{
    documentId?: string;
    firstName?: string | null;
    lastName?: string | null;
    username?: string | null;
    email?: string | null;
    status?: "active" | "previous";
    createdAt?: string;
    seatNumber?: number | null;
    seatLabel?: string | null;
    accessCodeDocumentId?: string | null;
    candidatesOnboarded?: number;
    campaigns?: Array<{
      documentId?: string;
      name?: string | null;
      jobRole?: string | null;
      campaignStatus?: string | null;
      approvalStatus?: string | null;
      candidatesOnboarded?: number;
    }>;
  }> }>(`/clients/${encodeURIComponent(clientDocumentId)}/hiring-managers`);

  return (response.data ?? []).map((manager) => {
    const name = [manager.firstName, manager.lastName].filter(Boolean).join(" ").trim();

    return {
      documentId: manager.documentId ?? manager.email ?? "hiring-manager",
      name: name || manager.username || manager.email || "Hiring manager",
      email: manager.email || "No email recorded",
      status: manager.status ?? "active",
      createdAt: manager.createdAt,
      seatNumber: manager.seatNumber ?? null,
      seatLabel: manager.seatLabel ?? null,
      accessCodeDocumentId: manager.accessCodeDocumentId ?? null,
      candidatesOnboarded: manager.candidatesOnboarded ?? 0,
      campaigns: (manager.campaigns ?? []).map((campaign) => ({
        documentId: campaign.documentId ?? campaign.name ?? "campaign",
        name: campaign.name || "Untitled campaign",
        jobRole: campaign.jobRole || "Role not set",
        campaignStatus: campaign.campaignStatus || "unknown",
        approvalStatus: campaign.approvalStatus || "unknown",
        candidatesOnboarded: campaign.candidatesOnboarded ?? 0,
      })),
    } satisfies ClientHiringManagerSeat;
  });
}

export async function releaseClientHiringManagerSeat(
  clientDocumentId: string,
  managerDocumentId: string
) {
  const response = await strapiRequest<StrapiSingleResponse<{
    documentId?: string;
    blocked?: boolean;
  }>>(
    `/clients/${encodeURIComponent(clientDocumentId)}/hiring-managers/${encodeURIComponent(managerDocumentId)}/release`,
    { method: "POST" }
  );

  return response.data;
}

function normalizeSharedCandidate(raw: Record<string, unknown>): ClientSharedCandidate {
  const candidates = (raw.candidates as Array<Record<string, unknown>> | undefined) ?? [];
  const hiringManagers =
    (raw.hiringManagers as Array<Record<string, unknown>> | undefined) ?? [];
  const campaigns = (raw.campaigns as Array<Record<string, unknown>> | undefined) ?? [];

  const candidate = candidates[0];
  const hm = hiringManagers[0];
  const campaign = campaigns[0];

  const candidateName = [candidate?.firstName, candidate?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const hmName = [hm?.firstName, hm?.lastName].filter(Boolean).join(" ").trim();

  return {
    documentId: String(raw.documentId ?? ""),
    reviewStatus: (raw.reviewStatus as ClientSharedCandidate["reviewStatus"]) ?? "pending_review",
    sharedAt: (raw.sharedAt as string | undefined) ?? null,
    candidateName: candidateName || String(candidate?.username ?? "Candidate"),
    candidateEmail: candidate?.email as string | undefined,
    hiringManagerName: hmName || String(hm?.email ?? "Hiring manager"),
    campaignName: String(campaign?.name ?? "Campaign"),
    role: String(campaign?.jobRole ?? "Role not set"),
  };
}

export async function getClientContract(clientDocumentId: string) {
  const response = await strapiRequest<{ data?: ClientContract | null }>(
    `/clients/${encodeURIComponent(clientDocumentId)}/contract`
  );
  return response.data ?? null;
}

export async function listClientSharedCandidates(reviewStatus?: string) {
  const query = reviewStatus ? `?reviewStatus=${encodeURIComponent(reviewStatus)}` : "";
  const response = await strapiRequest<{ data?: Array<Record<string, unknown>> }>(
    `/shared-candidates${query}`
  );
  return (response.data ?? []).map(normalizeSharedCandidate);
}

export async function updateSharedCandidateReviewStatus(
  sharedCandidateDocumentId: string,
  reviewStatus: ClientSharedCandidate["reviewStatus"]
) {
  const response = await strapiRequest<{ data?: Record<string, unknown> }>(
    `/shared-candidates/${encodeURIComponent(sharedCandidateDocumentId)}/status`,
    {
      method: "POST",
      body: JSON.stringify({ reviewStatus }),
    }
  );
  return response.data ? normalizeSharedCandidate(response.data) : null;
}

export async function getSharedCandidateMessageTemplates(
  sharedCandidateDocumentId: string
): Promise<ClientOutreachTemplates> {
  const response = await strapiRequest<{ data?: ClientOutreachTemplates }>(
    `/shared-candidates/${encodeURIComponent(sharedCandidateDocumentId)}/message-templates`
  );
  return (
    response.data ?? {
      inperson: { subject: "", body: "" },
      phone: { subject: "", body: "" },
    }
  );
}

export async function sendSharedCandidateMessage(
  sharedCandidateDocumentId: string,
  payload: {
    subject: string;
    body: string;
    templateKey?: ClientOutreachTemplateKey;
  }
): Promise<{ sent: string[]; failed: string[] }> {
  const response = await strapiRequest<{
    data?: { sent?: string[]; failed?: string[] };
  }>(`/shared-candidates/${encodeURIComponent(sharedCandidateDocumentId)}/message`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    sent: response.data?.sent ?? [],
    failed: response.data?.failed ?? [],
  };
}
