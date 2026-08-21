import type { ContractTier } from "@/types";

export type AdminAssessmentVersionOption = {
  version: string;
  title: string;
  description: string | null;
};

export type AdminClientRow = {
  id: string;
  name: string;
  status: "Active" | "Awaiting signup" | "Awaiting payment" | "Paused" | "Expired" | "Needs contract";
  plan: string;
  seatsUsed: number;
  seatsAllowed: number;
  enabledAssessments: string[];
  billingStatus: "Active" | "Not configured" | "Expired" | "Paused";
  primaryContact: string;
  lastActivity: string;
  pendingCampaignApprovals: number;
  hasClientContact: boolean;
  clientInviteStatus: "none" | "available" | "used" | "expired" | "revoked";
  clientInviteExpiresAt: string | null;
  canGenerateClientCode: boolean;
};

export type AdminOverview = {
  activeClients: number;
  awaitingClientSignups: number;
  pendingCampaignApprovals: number;
  availableClientCodes: number;
  contractsExpiringSoon: number;
  seatUsage: AdminClientRow[];
  recentActivity: Array<{
    id: string;
    title: string;
    detail: string;
  }>;
  attentionRequired: Array<{
    id: string;
    title: string;
    detail: string;
  }>;
};

export type AdminRevenueAnalytics = {
  generatedAt: string;
  currency: string;
  summary: {
    annualRecurringPence: number;
    monthlyRecurringPence: number;
    collectedThisMonthPence: number;
    collectedYearToDatePence: number;
    outstandingInvoicePence: number;
    requestedPipelinePence: number;
    renewalPipelinePence: number;
    activeContracts: number;
    activeClients: number;
    activeSeats: number;
    averageRevenuePerClientPence: number;
  };
  byTier: Array<{
    tier: string;
    label: string;
    clients: number;
    seats: number;
    annualRecurringPence: number;
    sharePercent: number;
  }>;
  pipeline: Array<{
    status: string;
    label: string;
    amountPence: number;
    count: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    label: string;
    paidPence: number;
    invoiceSentPence: number;
    requestedPence: number;
  }>;
  topClients: Array<{
    clientId: string;
    clientName: string;
    tier: string;
    seats: number;
    annualRecurringPence: number;
    contractEndDate: string | null;
  }>;
  recentPayments: Array<{
    id: string;
    requestNumber: string;
    clientName: string;
    subject: string;
    amountPence: number;
    paidAt: string | null;
    requestKind: string;
  }>;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: "CTRL Admin" | "Client Contact" | "Hiring Manager" | "Candidate";
  client: string;
  status: "Active" | "Invited" | "Disabled";
  lastLogin: string;
};

export type AdminUsersSummary = {
  users: AdminUserRow[];
  totals: {
    all: number;
    ctrlAdmins: number;
    clientContacts: number;
    hiringManagers: number;
    candidates: number;
    active: number;
    invited: number;
    disabled: number;
  };
};

export type AdminClientEntitlementRow = AdminClientRow & {
  activeContract: {
    documentId: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    seatCount: number;
    tier?: string;
    notes: string;
    paymentStatus?: string;
  } | null;
  features?: Record<string, unknown> | null;
};

export type AdminAuditLogRow = {
  id: string;
  actor: string;
  actorRole?: string;
  timestamp: string;
  rawTimestamp?: string;
  event: string;
  eventKey?: string;
  client: string;
  resource?: string;
  resourceLabel?: string;
  details: string;
};

export type AdminClientCreateInput = {
  name: string;
  legalName?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  officeAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  timeZone?: string;
  campaignApprovalMode: "auto_approve" | "require_approval";
  contract: {
    tier: ContractTier;
    seatCount: number;
    assessmentDataRetentionMonths: number;
    notes?: string;
  };
  issueAccessCode?: boolean;
};

export type AdminContractSummary = {
  documentId?: string;
  seatCount?: number;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  paymentStatus?: string;
  tier?: string;
  notes?: string | null;
  assessmentDataRetentionMonths?: number | null;
};

export type AdminClientCreateResult = {
  client: AdminClientRow;
  contract?: AdminContractSummary;
  accessCode?: {
    documentId: string;
    code: string;
    expiresAt: string;
    status: string;
    targetRole: string;
  };
};

export type AdminClientDetails = AdminClientRow & {
  legalName: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  address: string;
  timeZone: string;
  campaignApprovalMode: "auto_approve" | "require_approval";
  onboardingCompleted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  activeContract: {
    documentId: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    seatCount: number;
    tier?: string;
    notes: string;
    paymentStatus?: string;
    assessmentDataRetentionMonths: number | null;
    effectiveAssessmentDataRetentionMonths: number;
  } | null;
  users: AdminUserRow[];
  campaigns: Array<{
    id: string;
    title: string;
    status: string;
    approvalStatus: string;
    createdAt: string | null;
  }>;
  accessCodes: Array<{
    id: string;
    status: string;
    targetRole: string;
    expiresAt: string | null;
    createdAt: string | null;
  }>;
  features?: Record<string, unknown> | null;
};

export type AdminClientAccessCodeResult = {
  documentId: string;
  code: string;
  expiresAt: string;
  status: string;
  targetRole: string;
  invitedEmail?: string;
};
