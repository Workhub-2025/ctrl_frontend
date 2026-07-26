import "server-only";

import { requireFirebaseSession } from "@/lib/auth/firebase-bff-session";
import {
  createFirebaseTenancyApi,
  type FirebaseClientTeamWorkspace,
  type FirebaseInvitation,
  type FirebaseMembership,
  type FirebaseSeat,
} from "@/lib/firebase-tenancy-api";
import type {
  ClientAccessCode,
  ClientDashboardSummary,
  ClientHiringManagerSeat,
  ClientOverviewData,
} from "@/services/client-portal.service";

export async function requireFirebaseTenancySession(
  ...roles: Array<"candidate" | "hiring_manager" | "client" | "admin">
) {
  const auth = await requireFirebaseSession(...roles);
  const context = await auth.domainApi.getUserContext(auth.firebaseSessionCookie);
  if (context.accountStatus !== "active") {
    throw new Error("Account is not active");
  }
  if (!context.organizationId && context.portalRole !== "admin") {
    throw new Error("Organization membership is required");
  }
  return {
    ...auth,
    context,
    tenancy: createFirebaseTenancyApi(
      auth.domainApi,
      auth.firebaseSessionCookie,
      { organizationId: context.organizationId ?? null },
    ),
  };
}

function seatById(workspace: FirebaseClientTeamWorkspace) {
  return new Map(workspace.seats.map((seat) => [seat.id, seat] as const));
}

function campaignStatusFromRole(_role: FirebaseMembership["role"]): never[] {
  return [];
}

export function toClientHiringManagers(
  workspace: FirebaseClientTeamWorkspace,
): ClientHiringManagerSeat[] {
  const seats = seatById(workspace);
  return workspace.memberships
    .filter((membership) => membership.role === "hiring_manager")
    .map((membership) => {
      const seat = membership.seatId ? seats.get(membership.seatId) : undefined;
      return {
        documentId: membership.id,
        name: membership.displayName || membership.email || "Hiring manager",
        email: membership.email || "No email recorded",
        status: membership.status === "active" ? "active" : "previous",
        createdAt: membership.createdAt,
        seatNumber: seat?.seatNumber ?? null,
        seatLabel: seat?.seatLabel ?? (seat ? `Seat ${seat.seatNumber}` : null),
        accessCodeDocumentId: seat?.pendingInvitationId ?? null,
        candidatesOnboarded: 0,
        campaigns: campaignStatusFromRole(membership.role),
      } satisfies ClientHiringManagerSeat;
    });
}

export function toClientAccessCodes(
  workspace: FirebaseClientTeamWorkspace,
): ClientAccessCode[] {
  const seats = seatById(workspace);
  const invitationsById = new Map(
    workspace.invitations.map((invitation) => [invitation.id, invitation] as const),
  );

  const reservedCodes = workspace.seats
    .filter((seat) => seat.status === "reserved" && seat.pendingInvitationId)
    .map((seat) => {
      const invitation = invitationsById.get(seat.pendingInvitationId!);
      return toAccessCodeFromInvitation(invitation, seat);
    })
    .filter((value): value is ClientAccessCode => Boolean(value));

  const availableCodes = workspace.seats
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

  return [...reservedCodes, ...availableCodes];
}

function toAccessCodeFromInvitation(
  invitation: FirebaseInvitation | undefined,
  seat: FirebaseSeat,
): ClientAccessCode | null {
  if (!invitation || invitation.status !== "pending") return null;
  return {
    documentId: invitation.id,
    expiresAt: invitation.expiresAt,
    status: "reserved",
    targetRole: "hiring_manager",
    createdAt: invitation.createdAt,
    invitedEmail: invitation.email,
    seatNumber: seat.seatNumber,
    seatLabel: seat.seatLabel ?? `Seat ${seat.seatNumber}`,
  };
}

export function toClientDashboardSummary(
  workspace: FirebaseClientTeamWorkspace,
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
    availableAccessCodes: workspace.seatSummary.available,
    candidatesPendingReview: 0,
    campaignsPendingApproval: 0,
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

export function toClientOverview(
  workspace: FirebaseClientTeamWorkspace,
): ClientOverviewData {
  return {
    summary: toClientDashboardSummary(workspace),
    campaigns: [],
    accessCodes: toClientAccessCodes(workspace),
    hiringManagers: toClientHiringManagers(workspace),
  };
}

export function defaultInvitationExpiry(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}
