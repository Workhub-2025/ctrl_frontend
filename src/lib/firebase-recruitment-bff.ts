import "server-only";

import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import {
  createFirebaseRecruitmentApi,
  type FirebaseAssignment,
  type FirebaseCampaign,
  type FirebaseCampaignWorkspace,
  type FirebaseSession,
} from "@/lib/firebase-recruitment-api";
import {
  mapFirebaseReportToHmResult,
  type FirebaseAssignmentAssessmentReport,
} from "@/lib/hm-assessment-progress";
import type {
  HiringManagerCampaignDetail,
  HiringManagerCampaignListItem,
  HiringManagerSessionListItem,
} from "@/types/hiring-manager.types";
import type {
  ClientCampaignApprovalItem,
  ClientCampaignWorkspace,
} from "@/services/client-portal.service";

export async function requireFirebaseRecruitmentSession(
  ...roles: Array<"candidate" | "hiring_manager" | "client" | "admin">
) {
  const auth = await requireFirebaseSession(...roles);
  const context = await auth.domainApi.getUserContext(auth.firebaseSessionCookie);
  if (context.accountStatus !== "active") {
    throw new Error("Account is not active");
  }
  return {
    ...auth,
    context,
    recruitment: createFirebaseRecruitmentApi(
      auth.domainApi,
      auth.firebaseSessionCookie,
      { organizationId: context.organizationId ?? null },
    ),
  };
}

function campaignStatus(
  status: FirebaseCampaign["status"],
): HiringManagerCampaignListItem["status"] {
  switch (status) {
    case "active":
      return "Live";
    case "approved":
    case "pending_review":
      return "Configured";
    case "closed":
      return "Archived";
    default:
      return "Draft";
  }
}

function approvalStatus(
  status: FirebaseCampaign["status"],
): HiringManagerCampaignListItem["approvalStatus"] {
  if (status === "pending_review") return "Pending approval";
  if (status === "rejected") return "Rejected";
  return "Approved";
}

function deliveryMode(
  mode: FirebaseCampaign["assessmentMode"],
): HiringManagerCampaignListItem["deliveryMode"] {
  if (mode === "remote") return "Remote";
  if (mode === "hybrid") return "Hybrid";
  return "In-person";
}

function displayDate(value: string | null): string {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function toHiringManagerCampaign(
  campaign: FirebaseCampaign,
  workspace?: FirebaseCampaignWorkspace,
): HiringManagerCampaignListItem {
  const sessionCount = workspace?.sessions.length ?? 0;
  const stack =
    workspace?.assessmentStack
      .filter((item) => item.status === "active")
      .sort((left, right) => left.position - right.position)
      .map((item) => item.definitionId) ?? [];
  return {
    id: campaign.id,
    documentId: campaign.id,
    name: campaign.title,
    role: campaign.jobRole,
    status: campaignStatus(campaign.status),
    approvalStatus: approvalStatus(campaign.status),
    deliveryMode: deliveryMode(campaign.assessmentMode),
    candidateCount: workspace?.counts.assignments ?? campaign.vacancyCount,
    sessions: sessionCount,
    assessmentStack: stack,
    assessmentSettings: null,
    resolvedStackSummary: null,
    nextMilestone:
      campaign.status === "pending_review"
        ? "Awaiting client approval"
        : campaign.status === "rejected"
          ? "Client rejected campaign"
          : sessionCount > 0
            ? `${sessionCount} Session${sessionCount === 1 ? "" : "s"} created`
            : "Create a session",
  };
}

export function toHiringManagerSession(
  session: FirebaseSession,
  campaignName: string,
  assignments: readonly FirebaseAssignment[] = [],
  reportsByAssignmentId: ReadonlyMap<
    string,
    ReadonlyArray<FirebaseAssignmentAssessmentReport>
  > = new Map(),
): HiringManagerSessionListItem {
  const activeAssignments = assignments.filter(
    (assignment) =>
      assignment.sessionId === session.id &&
      !["withdrawn", "closed"].includes(assignment.status),
  );
  return {
    id: session.id,
    documentId: session.id,
    name: session.name,
    campaign: campaignName,
    type: session.mode === "remote" ? "Remote" : "In-person",
    status:
      session.status === "cancelled"
        ? "Cancelled"
        : session.status === "closed"
          ? "Closed"
          : session.status === "open"
            ? "Live"
            : "Upcoming",
    date: displayDate(session.startsAt),
    startsAt: session.startsAt,
    location: session.location ?? "Location to confirm",
    candidateCount: activeAssignments.length || session.claimedCapacity,
    candidateLimit: session.capacity,
    accessMode: "Session Code",
    // Codes are write-only and never returned by the domain API.
    accessValue: "Configured securely",
    pendingInvites: activeAssignments
      .filter((assignment) => assignment.status === "invited")
      .map((assignment) => ({
        id: assignment.id,
        email: assignment.inviteEmail,
        inviteStatus: "invited" as const,
        mode: session.mode === "remote" ? ("remote" as const) : ("in_person" as const),
      })),
    candidates: activeAssignments
      .filter((assignment) => assignment.candidateUserId !== null)
      .map((assignment) => {
        const results = (reportsByAssignmentId.get(assignment.id) ?? []).map(
          mapFirebaseReportToHmResult,
        );
        return {
          id: assignment.id,
          name: assignment.inviteEmail,
          email: assignment.inviteEmail,
          status: assignment.status,
          inviteStatus:
            assignment.invitationDeliveryStatus === "accepted"
              ? ("registered" as const)
              : ("started" as const),
          hasStartedAssessment:
            assignment.status !== "invited" || results.length > 0,
          results,
        };
      }),
  };
}

export function toHiringManagerCampaignDetail(
  workspace: FirebaseCampaignWorkspace,
  assignments: readonly FirebaseAssignment[],
  reportsByAssignmentId: ReadonlyMap<
    string,
    ReadonlyArray<FirebaseAssignmentAssessmentReport>
  > = new Map(),
): HiringManagerCampaignDetail {
  const base = toHiringManagerCampaign(workspace.campaign, workspace);
  const sessions = workspace.sessions.map((session) =>
    toHiringManagerSession(
      session,
      workspace.campaign.title,
      assignments,
      reportsByAssignmentId,
    ),
  );
  return {
    ...base,
    startDate: displayDate(workspace.campaign.startDate),
    endDate: displayDate(workspace.campaign.endDate),
    location: workspace.campaign.location ?? "Location to confirm",
    linkedAssessmentSlugs: workspace.assessmentStack
      .filter((item) => item.status === "active")
      .map((item) => item.definitionId),
    assessmentSessions: sessions,
    joinedCandidates: assignments
      .filter((assignment) => assignment.candidateUserId !== null)
      .map((assignment) => ({
        id: assignment.id,
        name: assignment.inviteEmail,
        email: assignment.inviteEmail,
        status: assignment.status,
        inviteStatus:
          assignment.invitationDeliveryStatus === "accepted"
            ? ("registered" as const)
            : null,
        sessionName:
          workspace.sessions.find((session) => session.id === assignment.sessionId)
            ?.name ?? "Unscheduled",
        campaignId: workspace.campaign.id,
        campaignName: workspace.campaign.title,
        assessmentStack: base.assessmentStack,
        results: [],
      })),
  };
}

export function toClientCampaign(
  campaign: FirebaseCampaign,
  workspace?: FirebaseCampaignWorkspace,
): ClientCampaignApprovalItem {
  const base = toHiringManagerCampaign(campaign, workspace);
  const latestReview = workspace?.reviews.at(-1);
  return {
    ...base,
    createdAt: campaign.createdAt,
    createdBy: campaign.ownerSeatId,
    approvalNote: latestReview?.rationale ?? null,
  };
}

export function toClientCampaignWorkspace(
  workspace: FirebaseCampaignWorkspace,
  assignments: readonly FirebaseAssignment[],
): ClientCampaignWorkspace {
  return {
    ...toClientCampaign(workspace.campaign, workspace),
    startDate: workspace.campaign.startDate,
    endDate: workspace.campaign.endDate,
    location: workspace.campaign.location,
    vacancyCount: workspace.campaign.vacancyCount,
    sessionsDetail: workspace.sessions.map((session) => ({
      documentId: session.id,
      name: session.name,
      sessionStatus: session.status,
      startsAt: session.startsAt,
      location: session.location,
      mode: session.mode,
      candidateLimit: session.capacity,
    })),
    sharedCandidates: assignments
      .filter((assignment) => assignment.visibility === "released")
      .map((assignment) => ({
        documentId: assignment.id,
        reviewStatus:
          assignment.status === "completed" ? ("reviewed" as const) : ("pending_review" as const),
        sharedAt: assignment.updatedAt,
        reviewStatusChangedAt: assignment.updatedAt,
        candidateName: assignment.inviteEmail,
        candidateEmail: assignment.inviteEmail,
        hiringManagerName: workspace.campaign.ownerSeatId,
        campaignName: workspace.campaign.title,
        role: workspace.campaign.jobRole,
      })),
  };
}
