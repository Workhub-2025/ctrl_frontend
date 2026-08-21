import type { HiringManagerCampaignListItem } from "@/types/hiring-manager.types";

export type ClientCampaignApprovalItem = HiringManagerCampaignListItem & {
  createdAt?: string;
  createdBy: string;
  approvalNote?: string | null;
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

export type ClientSharedCandidate = {
  documentId: string;
  reviewStatus: "pending_review" | "reviewed" | "progressed" | "hired" | "rejected";
  sharedAt?: string | null;
  reviewStatusChangedAt?: string | null;
  candidateName: string;
  candidateEmail?: string;
  hiringManagerName: string;
  campaignName: string;
  role: string;
};

export type ClientCampaignWorkspace = ClientCampaignApprovalItem & {
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  vacancyCount?: number | null;
  sessionsDetail: Array<{
    documentId: string;
    name: string;
    sessionStatus: string;
    startsAt?: string | null;
    location?: string | null;
    mode?: string;
    candidateLimit?: number;
  }>;
  sharedCandidates: ClientSharedCandidate[];
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

export type ClientAuditLog = {
  id: string;
  actorUserId: string;
  actorRole: string;
  actionType: string;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: string;
  createdAt: string;
  actorDisplayName?: string;
  clientDisplayName?: string | null;
  resourceDisplayName?: string | null;
  metadataResolved?: Record<string, string>;
  summary?: string;
};

export type BackendClientEntitlements = {
  client: {
    documentId?: string;
    name?: string;
    billingStatus?: string;
    autoRenew?: boolean;
  };
  contractActive: boolean;
  contract: {
    documentId?: string;
    seatCount?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
    paymentStatus?: string;
    paidAt?: string | null;
    daysUntilExpiry?: number | null;
    tier?: string;
    minimumContractedSeats?: number;
    founderDiscountPercent?: number | null;
    assessmentDataRetentionMonths?: number | null;
    effectiveAssessmentDataRetentionMonths?: number;
  } | null;
  dataRetention?: {
    platformDefaultMonths: number;
    effectiveMonths: number;
    contractConfiguredMonths: number | null;
  };
  platformFeatures: Record<string, boolean>;
  deliveryFeatures?: Record<string, boolean>;
  defaultAssessments: Array<{
    slug: string;
    title: string;
    maxVersion: string;
    includedByDefault: boolean;
    entitlementTier?: "core" | "premium" | string;
    availableVersions?: Array<{ version: string; title: string; description: string | null }>;
  }>;
  additionalAssessments: Array<{
    slug: string;
    title: string;
    summary?: string | null;
    maxVersion: string;
    entitlementTier?: "core" | "premium" | string;
    availableVersions?: Array<{ version: string; title: string; description: string | null }>;
  }>;
  requestableAssessments: Array<{
    slug: string;
    title: string;
    summary?: string | null;
    entitlementTier?: "core" | "premium" | string;
  }>;
  canRequestUpgrades: boolean;
  lockState?: {
    operational: boolean;
    reason: string | null;
    userMessage: string;
  };
};
