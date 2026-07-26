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
  };
}

export function toReportsByAssignmentId(
  reports: FirebaseHiringManagerOverview["reports"],
): ReadonlyMap<string, ReadonlyArray<FirebaseAssignmentAssessmentReport>> {
  return new Map(Object.entries(reports));
}
