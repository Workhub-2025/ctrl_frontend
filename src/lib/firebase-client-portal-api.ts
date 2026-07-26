import "server-only";

import {
  createFirebaseRecruitmentApi,
  type FirebaseCampaign,
  type FirebaseDomainRequester,
} from "@/lib/firebase-recruitment-api";
import { toClientCampaign } from "@/lib/firebase-recruitment-bff";
import type { FirebaseClientDashboard } from "@/lib/firebase-screen-api";
import type { ReturnTypeOfCreateFirebaseDomainApi } from "@/lib/firebase-domain-api-types";
import type {
  ClientAccessCode,
  ClientDashboardSummary,
  ClientHiringManagerSeat,
  ClientOverviewData,
  ClientOutreachTemplateKey,
  ClientOutreachTemplates,
} from "@/services/client-portal.service";
import type { ClientAuditLog } from "@/services/client-logs.service";

export type FirebaseOrganization = Readonly<{
  id: string;
  legalName: string;
  status: "active" | "suspended" | "closed";
  campaignApprovalMode: "auto_approve" | "require_approval";
  createdAt: string;
  updatedAt: string;
}>;

export type FirebaseClientTeamWorkspace = Readonly<{
  organization: FirebaseOrganization;
  seats: Array<{
    id: string;
    organizationId: string;
    seatNumber: number;
    seatLabel: string | null;
    status: "available" | "reserved" | "occupied" | "disabled";
    pendingInvitationId: string | null;
    activeMembershipId: string | null;
  }>;
  memberships: Array<{
    id: string;
    userId: string;
    organizationId: string;
    seatId: string | null;
    role: "hiring_manager" | "client_owner" | "client_admin";
    status: "active" | "revoked";
    displayName: string | null;
    email: string | null;
    createdAt: string;
    revokedAt: string | null;
  }>;
  invitations: Array<{
    id: string;
    organizationId: string;
    seatId: string | null;
    role: "hiring_manager" | "client_owner" | "client_admin";
    status: "pending" | "accepted" | "revoked" | "expired";
    email: string;
    expiresAt: string;
    createdAt: string;
  }>;
  entitlements: Array<{
    id: string;
    organizationId: string;
    entitlementKey: "hiring_manager_seats";
    quantity: number;
    source: "administrator" | "contract";
    status: "active" | "expired" | "revoked";
    validFrom: string;
    validUntil: string | null;
  }>;
  seatSummary: {
    limit: number;
    used: number;
    available: number;
    reserved: number;
  };
}>;

export type FirebaseOrganizationAuditEvent = Readonly<{
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

type DomainRequester = Pick<
  ReturnTypeOfCreateFirebaseDomainApi,
  "request"
>;

export function createFirebaseClientPortalApi(
  domainApi: DomainRequester,
  firebaseSessionCookie: string,
) {
  const request = <ResponseBody>(
    path: `/${string}`,
    options: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: unknown;
    } = {},
  ) =>
    domainApi.request<ResponseBody>({
      path,
      firebaseSessionCookie,
      ...options,
    });

  return {
    getOrganization(organizationId: string) {
      return request<FirebaseOrganization>(
        `/v1/organizations/${encodeURIComponent(organizationId)}`,
      );
    },
    getTeamWorkspace(organizationId: string) {
      return request<FirebaseClientTeamWorkspace>(
        `/v1/organizations/${encodeURIComponent(organizationId)}/workspace`,
      );
    },
    updateApprovalMode(
      organizationId: string,
      campaignApprovalMode: "auto_approve" | "require_approval",
    ) {
      return request<FirebaseOrganization>(
        `/v1/organizations/${encodeURIComponent(organizationId)}`,
        {
          method: "PATCH",
          body: { campaignApprovalMode },
        },
      );
    },
    listAuditEvents(organizationId: string, limit = 100) {
      return request<FirebaseOrganizationAuditEvent[]>(
        `/v1/organizations/${encodeURIComponent(organizationId)}/audit-events?limit=${limit}`,
      );
    },
    getOutreachTemplates(assignmentId: string) {
      return request<ClientOutreachTemplates>(
        `/v1/assignments/${encodeURIComponent(assignmentId)}/outreach-templates`,
      );
    },
    sendOutreachMessage(
      assignmentId: string,
      body: {
        subject: string;
        body: string;
        templateKey?: ClientOutreachTemplateKey;
        idempotencyKey: string;
      },
    ) {
      return request<{
        sent: string[];
        failed: string[];
        alreadyQueued: boolean;
      }>(`/v1/assignments/${encodeURIComponent(assignmentId)}/outreach`, {
        method: "POST",
        body,
      });
    },
  };
}

export function toClientAuditLogs(
  events: readonly FirebaseOrganizationAuditEvent[],
): ClientAuditLog[] {
  return events.map((event) => ({
    id: event.id,
    actorUserId: event.actorUserId ?? "system",
    actorRole: "staff",
    actionType: event.action,
    resource: event.resourceType,
    resourceId: event.resourceId,
    metadata: null,
    occurredAt: event.occurredAt,
    createdAt: event.occurredAt,
    actorDisplayName: event.actorDisplayName ?? undefined,
    clientDisplayName: null,
    resourceDisplayName: event.resourceType,
    metadataResolved: undefined,
    summary: `${event.action} on ${event.resourceType}`,
  }));
}

function toAccessCodes(
  workspace: FirebaseClientTeamWorkspace,
): ClientAccessCode[] {
  const invitationsById = new Map(
    workspace.invitations.map((invitation) => [invitation.id, invitation] as const),
  );

  const reservedFromInvites = workspace.seats
    .filter((seat) => seat.status === "reserved" && seat.pendingInvitationId)
    .flatMap((seat) => {
      const invitation = invitationsById.get(seat.pendingInvitationId!);
      if (!invitation || invitation.status !== "pending") return [];
      const code: ClientAccessCode = {
        documentId: invitation.id,
        expiresAt: invitation.expiresAt,
        status: "reserved",
        targetRole: "hiring_manager",
        createdAt: invitation.createdAt,
        invitedEmail: invitation.email,
        seatNumber: seat.seatNumber,
        seatLabel: seat.seatLabel ?? `Seat ${seat.seatNumber}`,
      };
      return [code];
    });

  const pendingWithoutSeat = workspace.invitations
    .filter(
      (invitation) =>
        invitation.status === "pending" &&
        invitation.role === "hiring_manager" &&
        !reservedFromInvites.some((code) => code.documentId === invitation.id),
    )
    .map((invitation) => {
      const seat = workspace.seats.find((item) => item.id === invitation.seatId);
      return {
        documentId: invitation.id,
        expiresAt: invitation.expiresAt,
        status: "reserved",
        targetRole: "hiring_manager" as const,
        createdAt: invitation.createdAt,
        invitedEmail: invitation.email,
        seatNumber: seat?.seatNumber ?? null,
        seatLabel: seat?.seatLabel ?? null,
      } satisfies ClientAccessCode;
    });

  // Available seats must appear as invite slots so the client UI does not fall
  // back to the legacy "Generate invite key" access-code flow.
  const availableSlots = workspace.seats
    .filter((seat) => seat.status === "available")
    .map(
      (seat) =>
        ({
          documentId: seat.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: "available",
          targetRole: "hiring_manager",
          invitedEmail: null,
          seatNumber: seat.seatNumber,
          seatLabel: seat.seatLabel ?? `Seat ${seat.seatNumber}`,
        }) satisfies ClientAccessCode,
    );

  return [...reservedFromInvites, ...pendingWithoutSeat, ...availableSlots];
}

function toHiringManagers(
  workspace: FirebaseClientTeamWorkspace,
  campaigns: readonly FirebaseCampaign[],
): ClientHiringManagerSeat[] {
  return workspace.memberships
    .filter((membership) => membership.role === "hiring_manager")
    .map((membership) => {
      const seat = workspace.seats.find((item) => item.id === membership.seatId);
      const ownedCampaigns = campaigns.filter(
        (campaign) => campaign.ownerSeatId === membership.seatId,
      );
      return {
        documentId: membership.id,
        name:
          membership.displayName ||
          membership.email ||
          "Hiring manager",
        email: membership.email || "No email recorded",
        status: membership.status === "active" ? "active" : "previous",
        createdAt: membership.createdAt,
        seatNumber: seat?.seatNumber ?? null,
        seatLabel: seat?.seatLabel ?? null,
        accessCodeDocumentId: seat?.pendingInvitationId ?? null,
        candidatesOnboarded: 0,
        campaigns: ownedCampaigns.map((campaign) => ({
          documentId: campaign.id,
          name: campaign.title,
          jobRole: campaign.jobRole,
          campaignStatus: campaign.status,
          approvalStatus:
            campaign.status === "pending_review"
              ? "pending"
              : campaign.status === "rejected"
                ? "rejected"
                : "approved",
          candidatesOnboarded: 0,
        })),
      } satisfies ClientHiringManagerSeat;
    });
}

export function toClientOverviewFromScreen(
  dashboard: FirebaseClientDashboard,
): ClientOverviewData {
  return {
    summary: toClientDashboardSummary(
      dashboard.workspace,
      dashboard.campaigns,
      dashboard.releasedAssignmentCount,
    ),
    campaigns: dashboard.campaigns.map((campaign) => toClientCampaign(campaign)),
    accessCodes: toAccessCodes(dashboard.workspace),
    hiringManagers: toHiringManagers(dashboard.workspace, dashboard.campaigns),
  };
}

export function toClientDashboardSummary(
  workspace: FirebaseClientTeamWorkspace,
  campaigns: readonly FirebaseCampaign[],
  pendingReviewCount: number,
): ClientDashboardSummary {
  const seatEntitlement = workspace.entitlements.find(
    (entitlement) =>
      entitlement.entitlementKey === "hiring_manager_seats" &&
      entitlement.status === "active",
  );
  return {
    client: {
      documentId: workspace.organization.id,
      name: workspace.organization.legalName,
      campaignApprovalMode: workspace.organization.campaignApprovalMode,
      features: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    },
    seats: {
      limit: workspace.seatSummary.limit,
      used: workspace.seatSummary.used,
      available: workspace.seatSummary.available,
    },
    availableAccessCodes: toAccessCodes(workspace).filter(
      (code) => code.status === "available" || code.status === "reserved",
    ).length,
    candidatesPendingReview: pendingReviewCount,
    campaignsPendingApproval: campaigns.filter(
      (campaign) => campaign.status === "pending_review",
    ).length,
    activeContract: seatEntitlement
      ? {
          documentId: seatEntitlement.id,
          seatCount: seatEntitlement.quantity,
          startDate: seatEntitlement.validFrom,
          endDate: seatEntitlement.validUntil ?? undefined,
          status: seatEntitlement.status,
          tier: seatEntitlement.source,
          minimumContractedSeats: seatEntitlement.quantity,
          notes: null,
        }
      : null,
  };
}

export async function buildClientOverview(
  domainApi: FirebaseDomainRequester,
  firebaseSessionCookie: string,
  organizationId: string,
): Promise<ClientOverviewData> {
  const portal = createFirebaseClientPortalApi(domainApi, firebaseSessionCookie);
  const recruitment = createFirebaseRecruitmentApi(
    domainApi,
    firebaseSessionCookie,
  );
  const [workspace, campaignResult] = await Promise.all([
    portal.getTeamWorkspace(organizationId),
    recruitment.listCampaigns(organizationId),
  ]);
  const workspaces = await Promise.all(
    campaignResult.items.map(async (campaign) => {
      const [detail, assignments] = await Promise.all([
        recruitment.getCampaign(campaign.id),
        recruitment.listAssignments(campaign.id),
      ]);
      return { campaign, detail, assignments: assignments.items };
    }),
  );
  const pendingReviewCount = workspaces.reduce(
    (total, item) =>
      total +
      item.assignments.filter(
        (assignment) => assignment.visibility === "released",
      ).length,
    0,
  );
  return {
    summary: toClientDashboardSummary(
      workspace,
      campaignResult.items,
      pendingReviewCount,
    ),
    campaigns: workspaces.map(({ campaign, detail }) =>
      toClientCampaign(campaign, detail),
    ),
    accessCodes: toAccessCodes(workspace),
    hiringManagers: toHiringManagers(workspace, campaignResult.items),
  };
}
