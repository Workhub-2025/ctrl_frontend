import "server-only";

import { createHash } from "node:crypto";

import type { ReturnTypeOfCreateFirebaseDomainApi } from "@/lib/firebase-domain-api-types";
import { invalidateOrganizationScreenCaches } from "@/lib/portal-cache-invalidation";

export type FirebaseCampaign = Readonly<{
  id: string;
  organizationId: string;
  ownerSeatId: string;
  title: string;
  description: string;
  jobRole: string;
  campaignType: string;
  assessmentMode: "remote" | "in_person" | "hybrid";
  startDate: string;
  endDate: string | null;
  isOngoing: boolean;
  vacancyCount: number;
  location: string | null;
  status: "draft" | "pending_review" | "approved" | "rejected" | "active" | "closed";
  version: number;
  createdAt: string;
  updatedAt: string;
}>;

export type FirebaseSession = Readonly<{
  id: string;
  organizationId: string;
  campaignId: string;
  name: string;
  mode: "remote" | "in_person" | "hybrid";
  location: string | null;
  startsAt: string;
  capacity: number;
  claimedCapacity: number;
  status: "scheduled" | "open" | "closed" | "cancelled";
  version: number;
}>;

export type FirebaseAssignment = Readonly<{
  id: string;
  organizationId: string;
  campaignId: string;
  sessionId: string | null;
  candidateUserId: string | null;
  inviteEmail: string;
  status: "pending" | "invited" | "locked" | "active" | "completed" | "withdrawn" | "closed";
  invitationDeliveryStatus:
    | "pending"
    | "dispatched"
    | "accepted"
    | "revoked"
    | "not_required";
  visibility: "private" | "released";
  version: number;
  createdAt: string;
  updatedAt: string;
}>;

export type FirebaseCampaignWorkspace = Readonly<{
  campaign: FirebaseCampaign;
  assessmentStack: Array<{
    id: string;
    definitionId: string;
    releaseId: string;
    position: number;
    durationMinutes: number | null;
    maxAttempts: number;
    threshold: number | null;
    status: "active" | "disabled";
  }>;
  reviews: Array<{
    id: string;
    campaignVersion: number;
    reviewerUserId: string;
    decision: "approved" | "rejected";
    rationale: string;
    createdAt: string;
  }>;
  sessions: FirebaseSession[];
  counts: {
    assignments: number;
    invited: number;
    active: number;
    completed: number;
  };
}>;

export type FirebaseCandidateWorkspaceItem = Readonly<{
  assignment: FirebaseAssignment;
  campaign: FirebaseCampaign;
  session: FirebaseSession | null;
  assessments: ReadonlyArray<{
    campaignAssessmentId: string;
    definitionId: string;
    releaseId: string;
    slug: string;
    title: string;
    position: number;
    status: "available" | "in_progress" | "submitted" | "completed" | "locked" | "not_open";
  }>;
}>;

type FirebaseAssessmentCatalogueItem = Readonly<{
  definitionId: string;
  releaseId: string;
  releaseVersion?: string | null;
  slug: string;
  title: string;
  availableReleases?: ReadonlyArray<{
    releaseId: string;
    releaseVersion: string;
    status: "active" | "retired";
  }>;
}>;

export type FirebaseDomainRequester = Pick<
  ReturnTypeOfCreateFirebaseDomainApi,
  "request"
>;

export function recruitmentIdempotencyKey(
  scope: string,
  actorId: string,
  payload: unknown,
): string {
  return createHash("sha256")
    .update(`${scope}\u001f${actorId}\u001f${JSON.stringify(payload)}`)
    .digest("hex");
}

export function createFirebaseRecruitmentApi(
  domainApi: FirebaseDomainRequester,
  firebaseSessionCookie: string,
  options: { organizationId?: string | null } = {},
) {
  const request = async <ResponseBody>(
    path: `/${string}`,
    requestOptions: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: unknown;
    } = {},
  ) => {
    const result = await domainApi.request<ResponseBody>({
      path,
      firebaseSessionCookie,
      ...requestOptions,
    });
    // Every recruitment write can move a count on the HM overview or the
    // client dashboard. Rotating the org generation here means a new route
    // cannot forget to invalidate the screen aggregates.
    if (requestOptions.method && requestOptions.method !== "GET") {
      await invalidateOrganizationScreenCaches(options.organizationId);
    }
    return result;
  };

  return {
    getCandidateWorkspace() {
      return request<FirebaseCandidateWorkspaceItem[]>("/v1/candidate/workspace");
    },
    listCampaigns(organizationId: string, limit = 100) {
      return request<{ items: FirebaseCampaign[]; nextCursor: string | null }>(
        `/v1/campaigns?organizationId=${encodeURIComponent(organizationId)}&limit=${limit}`,
      );
    },
    getCampaign(campaignId: string) {
      return request<FirebaseCampaignWorkspace>(
        `/v1/campaigns/${encodeURIComponent(campaignId)}`,
      );
    },
    createCampaign(body: Record<string, unknown>) {
      return request<{ campaignId: string; alreadyCreated: boolean }>(
        "/v1/campaigns",
        { method: "POST", body },
      );
    },
    updateCampaign(campaignId: string, body: Record<string, unknown>) {
      return request<{ version: number; alreadyApplied: boolean }>(
        `/v1/campaigns/${encodeURIComponent(campaignId)}`,
        { method: "PATCH", body },
      );
    },
    archiveCampaign(campaignId: string, body: Record<string, unknown>) {
      return request<{ version: number; alreadyApplied: boolean }>(
        `/v1/campaigns/${encodeURIComponent(campaignId)}/archive`,
        { method: "POST", body },
      );
    },
    replaceAssessmentStack(campaignId: string, body: Record<string, unknown>) {
      return request<{ campaignId: string; version: number; alreadyApplied: boolean }>(
        `/v1/campaigns/${encodeURIComponent(campaignId)}/assessment-stack`,
        { method: "PUT", body },
      );
    },
    reviewCampaign(campaignId: string, body: Record<string, unknown>) {
      return request<{ reviewId: string; version: number; alreadyApplied: boolean }>(
        `/v1/campaigns/${encodeURIComponent(campaignId)}/reviews`,
        { method: "POST", body },
      );
    },
    listSessions(organizationId: string, limit = 100) {
      return request<{ items: FirebaseSession[]; nextCursor: string | null }>(
        `/v1/sessions?organizationId=${encodeURIComponent(organizationId)}&limit=${limit}`,
      );
    },
    getSession(sessionId: string) {
      return request<FirebaseSession>(
        `/v1/sessions/${encodeURIComponent(sessionId)}`,
      );
    },
    revealSessionAccessCode(sessionId: string) {
      return request<{ accessCode: string; sessionId: string }>(
        `/v1/sessions/${encodeURIComponent(sessionId)}/join-material`,
      );
    },
    createSession(campaignId: string, body: Record<string, unknown>) {
      return request<{
        sessionId: string;
        accessCode: string;
        alreadyCreated: boolean;
      }>(
        `/v1/campaigns/${encodeURIComponent(campaignId)}/sessions`,
        { method: "POST", body },
      );
    },
    updateSession(sessionId: string, body: Record<string, unknown>) {
      return request<{ version: number; alreadyApplied: boolean }>(
        `/v1/sessions/${encodeURIComponent(sessionId)}`,
        { method: "PATCH", body },
      );
    },
    transitionSession(sessionId: string, body: Record<string, unknown>) {
      return request<{ version: number; alreadyApplied: boolean }>(
        `/v1/sessions/${encodeURIComponent(sessionId)}/status`,
        { method: "POST", body },
      );
    },
    linkAccessCode(body: { accessCode: string; idempotencyKey: string }) {
      return request<{
        assignmentId: string;
        sessionId: string;
        alreadyLinked: boolean;
      }>("/v1/sessions/access-code/link", { method: "POST", body });
    },
    listAssignments(campaignId: string, limit = 100) {
      return request<{ items: FirebaseAssignment[]; nextCursor: string | null }>(
        `/v1/campaigns/${encodeURIComponent(campaignId)}/assignments?limit=${limit}`,
      );
    },
    getAssignment(assignmentId: string) {
      return request<{
        assignment: FirebaseAssignment;
        decisions: Array<{
          id: string;
          actorUserId: string;
          decision: "progress" | "hold" | "reject" | "hire" | "reopen";
          rationale: string;
          createdAt: string;
        }>;
        notes: Array<{
          id: string;
          actorUserId: string;
          actorPortalRole: "hiring_manager" | "client" | "admin";
          visibility: "organization" | "internal";
          content: string;
          createdAt: string;
        }>;
        adjustment: unknown | null;
      }>(`/v1/assignments/${encodeURIComponent(assignmentId)}`);
    },
    createAssignment(campaignId: string, body: Record<string, unknown>) {
      return request<{ assignmentId: string; alreadyCreated: boolean }>(
        `/v1/campaigns/${encodeURIComponent(campaignId)}/assignments`,
        { method: "POST", body },
      );
    },
    updateAssignment(assignmentId: string, body: Record<string, unknown>) {
      return request<{ version: number; alreadyApplied: boolean }>(
        `/v1/assignments/${encodeURIComponent(assignmentId)}`,
        { method: "PATCH", body },
      );
    },
    unlockAssignment(
      assignmentId: string,
      body: { idempotencyKey: string },
    ) {
      return request<{ version: number; alreadyUnlocked: boolean }>(
        `/v1/assignments/${encodeURIComponent(assignmentId)}/unlock`,
        { method: "POST", body },
      );
    },
    resendAssignmentInvitation(
      assignmentId: string,
      body: { idempotencyKey: string },
    ) {
      return request<{ assignmentId: string; alreadyQueued: boolean }>(
        `/v1/assignments/${encodeURIComponent(assignmentId)}/invitation/resend`,
        { method: "POST", body },
      );
    },
    addDecision(assignmentId: string, body: Record<string, unknown>) {
      return request<{ decisionId: string; alreadyCreated: boolean }>(
        `/v1/assignments/${encodeURIComponent(assignmentId)}/decisions`,
        { method: "POST", body },
      );
    },
    addNote(assignmentId: string, body: Record<string, unknown>) {
      return request<{ noteId: string; alreadyCreated: boolean }>(
        `/v1/assignments/${encodeURIComponent(assignmentId)}/notes`,
        { method: "POST", body },
      );
    },
    listAssessmentCatalogue() {
      return request<FirebaseAssessmentCatalogueItem[]>(
        "/v1/recruitment/assessment-catalogue",
      );
    },
  };
}
