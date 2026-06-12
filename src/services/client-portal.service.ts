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
  };
  seats: {
    limit: number;
    used: number;
    available: number;
  };
  availableAccessCodes: number;
  candidatesPendingReview: number;
  campaignsPendingApproval: number;
};

export type ClientAccessCode = {
  documentId: string;
  code?: string;
  expiresAt: string;
  status: string;
  targetRole: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ClientHiringManagerSeat = {
  documentId: string;
  name: string;
  email: string;
  status: "active" | "previous";
  createdAt?: string;
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

export async function generateHiringManagerAccessCode() {
  const response = await strapiRequest<{ data?: ClientAccessCode }>(
    "/access-codes/generate",
    { method: "POST" }
  );

  return response.data;
}

export async function refreshHiringManagerAccessCode(refreshCodeDocumentId: string) {
  const response = await strapiRequest<{ data?: ClientAccessCode }>(
    "/access-codes/generate",
    {
      method: "POST",
      body: JSON.stringify({ refreshCodeDocumentId }),
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
