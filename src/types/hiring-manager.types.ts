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
  assessmentStatus?: string | null;
  passed?: boolean | null;
  completedAt?: string | null;
  wpm?: number | null;
  accuracy?: number | null;
  mistakeCount?: number | null;
  durationSeconds?: number | null;
  metrics?: Record<string, unknown> | null;
  rawData?: Record<string, any> | null;
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
  pendingInvites: Array<{
    id: string;
    email: string;
    inviteStatus: "invited" | "registered" | "started";
    candidateCode?: string;
    mode?: "in_person" | "remote";
  }>;
  candidates: Array<{
    id: string;
    name: string;
    email?: string;
    status?: string;
    hasStartedAssessment?: boolean;
    results: HiringManagerAssessmentResult[];
  }>;
};

export type HiringManagerCampaignDetail = HiringManagerCampaignListItem & {
  startDate: string;
  endDate: string;
  location: string;
  linkedAssessmentSlugs: string[];
  assessmentSessions: HiringManagerSessionListItem[];
  joinedCandidates: Array<{
    id: string;
    name: string;
    email?: string;
    status?: string;
    inviteStatus?: "invited" | "registered" | "started" | null;
    hmDecision?: "pending" | "approved" | "rejected" | null;
    sessionName?: string;
    campaignId?: string;
    campaignName?: string;
    assessmentStack?: string[];
    results?: HiringManagerAssessmentResult[];
  }>;
};

export type HiringManagerResolvedStackItem = {
  documentId: string;
  slug: string;
  displayName: string;
  weight: number;
};

export type HiringManagerResolvedStackSummary = {
  assessments: HiringManagerResolvedStackItem[];
  weightsTotal: number;
  resolvedAt: string;
};

export type HiringManagerAssessmentSessionSummary = {
  documentId: string;
  name: string;
  startsAt: string | null;
};

export type HiringManagerCandidateReport = {
  sessionId: string;
  candidate: {
    documentId: string | null;
    name: string;
    email?: string;
  };
  campaign: {
    documentId: string;
    name: string;
    role: string;
    assessmentSettings?: Record<string, unknown> | null;
    resolvedStackSummary: HiringManagerResolvedStackSummary | null;
    assessmentStack: string[];
  };
  assessmentSession: HiringManagerAssessmentSessionSummary | null;
  results: HiringManagerAssessmentResult[];
  compositeScore: number | null;
  hmDecision: "pending" | "approved" | "rejected" | null;
  hmDecisionAt?: string | null;
  hmDecisionNote?: string | null;
};
