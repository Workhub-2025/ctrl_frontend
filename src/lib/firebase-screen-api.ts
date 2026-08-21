import "server-only";

import type { FirebaseClientTeamWorkspace } from "@/lib/firebase-client-portal-api";
import type {
  FirebaseAssignment,
  FirebaseCampaign,
  FirebaseCampaignWorkspace,
  FirebaseDomainRequester,
} from "@/lib/firebase-recruitment-api";
import type { FirebaseAssignmentAssessmentReport } from "@/lib/hm-assessment-progress";

/**
 * Screen aggregates.
 *
 * Both portal screens used to be assembled by the BFF issuing one domain API
 * call per campaign, per assignment list and per candidate report. The domain
 * API now composes each screen in a single response, so the BFF pays one
 * authenticated cross-cloud round trip instead of one per resource.
 */

export type FirebaseHiringManagerOverview = Readonly<{
  campaigns: ReadonlyArray<{
    workspace: FirebaseCampaignWorkspace;
    assignments: FirebaseAssignment[];
  }>;
  reports: Readonly<
    Record<string, ReadonlyArray<FirebaseAssignmentAssessmentReport>>
  >;
}>;

export type FirebaseClientDashboard = Readonly<{
  workspace: FirebaseClientTeamWorkspace;
  campaigns: FirebaseCampaign[];
  releasedAssignmentCount: number;
}>;

export type FirebaseClientSharedCandidate = Readonly<{
  documentId: string;
  reviewStatus:
    | "pending_review"
    | "reviewed"
    | "progressed"
    | "hired"
    | "rejected";
  sharedAt: string;
  reviewStatusChangedAt: string;
  candidateName: string;
  candidateEmail: string;
  hiringManagerName: string;
  campaignName: string;
  role: string;
}>;

export type FirebaseClientSharedCandidates = Readonly<{
  items: FirebaseClientSharedCandidate[];
}>;

export type FirebaseAdminOverviewOrganizationCard = Readonly<{
  id: string;
  legalName: string;
  status?: string;
  updatedAt?: string;
  activeSeats: number;
  pendingUpgradesCount: number;
  contractSummary: {
    id?: string;
    tier?: string;
    status: string;
    seatCount: number;
    startDate: string | null;
    endDate: string | null;
    paymentStatus?: string;
  } | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  hasClientContact?: boolean;
  clientInviteStatus?: string;
  clientInviteExpiresAt?: string | null;
  features?: {
    deliveryRemote?: boolean;
    deliveryHybrid?: boolean;
    assessmentRecovery?: boolean;
    additionalAssessmentSlugs?: readonly string[];
  } | null;
}>;

export type FirebaseAdminOverviewScreen = Readonly<{
  organizations: FirebaseAdminOverviewOrganizationCard[];
  totalOrganizations: number;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Domain returns `{ data: { organizations, totalOrganizations } }`. The Cloud
 * Run BFF client already unwraps `data`, but a few callers still type the
 * envelope. Accept either shape so `.organizations` is never read off undefined.
 */
export function normalizeAdminOverviewScreen(
  payload: unknown,
): FirebaseAdminOverviewScreen {
  const record = isRecord(payload) ? payload : {};
  const inner = Array.isArray(record.organizations)
    ? record
    : isRecord(record.data)
      ? record.data
      : {};
  const organizations = Array.isArray(inner.organizations)
    ? (inner.organizations as FirebaseAdminOverviewOrganizationCard[])
    : [];
  return {
    organizations,
    totalOrganizations:
      typeof inner.totalOrganizations === "number"
        ? inner.totalOrganizations
        : organizations.length,
  };
}

export type FirebaseAdminAuditEvent = Readonly<{
  id: string;
  actorUserId: string | null;
  actorFirebaseUid: string | null;
  actorDisplayName: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  organizationId: string | null;
  occurredAt: string;
}>;

export type FirebaseAdminAuditScreen = Readonly<{
  items: FirebaseAdminAuditEvent[];
  events: FirebaseAdminAuditEvent[];
  nextCursor?: string | null;
}>;

export function createFirebaseScreenApi(
  domainApi: FirebaseDomainRequester,
  firebaseSessionCookie: string,
) {
  return {
    getHiringManagerOverview() {
      return domainApi.request<FirebaseHiringManagerOverview>({
        path: "/v1/screens/hm-overview",
        firebaseSessionCookie,
      });
    },
    getClientDashboard() {
      return domainApi.request<FirebaseClientDashboard>({
        path: "/v1/screens/client-dashboard",
        firebaseSessionCookie,
      });
    },
    getClientSharedCandidates() {
      return domainApi.request<FirebaseClientSharedCandidates>({
        path: "/v1/screens/client-shared-candidates",
        firebaseSessionCookie,
      });
    },
    async getAdminOverview() {
      const payload = await domainApi.request<unknown>({
        path: "/v1/screens/admin-overview",
        firebaseSessionCookie,
      });
      return normalizeAdminOverviewScreen(payload);
    },
    getAdminAuditEvents(params?: { limit?: number; cursor?: string }) {
      const search = new URLSearchParams();
      if (params?.limit) search.set("limit", String(params.limit));
      if (params?.cursor) search.set("cursor", params.cursor);
      const query = search.toString();
      return domainApi.request<FirebaseAdminAuditScreen>({
        path: `/v1/screens/admin-audit${query ? `?${query}` : ""}`,
        firebaseSessionCookie,
      });
    },
  };
}

export function toReportsByAssignmentId(
  reports: FirebaseHiringManagerOverview["reports"],
): ReadonlyMap<string, ReadonlyArray<FirebaseAssignmentAssessmentReport>> {
  return new Map(Object.entries(reports));
}
