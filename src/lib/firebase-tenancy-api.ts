import "server-only";

import type { ReturnTypeOfCreateFirebaseDomainApi } from "@/lib/firebase-domain-api-types";
import { invalidateOrganizationScreenCaches } from "@/lib/portal-cache-invalidation";

export type FirebaseOrganization = Readonly<{
  id: string;
  legalName: string;
  status: "active" | "suspended" | "closed";
  campaignApprovalMode: "auto_approve" | "require_approval";
  createdAt: string;
  updatedAt: string;
}>;

export type FirebaseSeat = Readonly<{
  id: string;
  organizationId: string;
  seatNumber: number;
  seatLabel: string | null;
  status: "available" | "reserved" | "occupied" | "disabled";
  pendingInvitationId: string | null;
  activeMembershipId: string | null;
}>;

export type FirebaseMembership = Readonly<{
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

export type FirebaseInvitation = Readonly<{
  id: string;
  organizationId: string;
  seatId: string | null;
  role: "hiring_manager" | "client_owner" | "client_admin";
  status: "pending" | "accepted" | "revoked" | "expired";
  email: string;
  expiresAt: string;
  createdAt: string;
}>;

export type FirebaseEntitlement = Readonly<{
  id: string;
  organizationId: string;
  entitlementKey: "hiring_manager_seats";
  quantity: number;
  source: "administrator" | "contract";
  status: "active" | "expired" | "revoked";
  validFrom: string;
  validUntil: string | null;
}>;

export type FirebaseClientTeamWorkspace = Readonly<{
  organization: FirebaseOrganization;
  seats: FirebaseSeat[];
  memberships: FirebaseMembership[];
  invitations: FirebaseInvitation[];
  entitlements: FirebaseEntitlement[];
  seatSummary: {
    limit: number;
    used: number;
    available: number;
    reserved: number;
  };
}>;

type FirebaseDomainRequester = Pick<
  ReturnTypeOfCreateFirebaseDomainApi,
  "request"
>;

export function createFirebaseTenancyApi(
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
    // Seat, membership and invitation writes move the client dashboard, which
    // shares the org generation with the HM overview.
    if (requestOptions.method && requestOptions.method !== "GET") {
      await invalidateOrganizationScreenCaches(options.organizationId);
    }
    return result;
  };

  return {
    getOrganization(organizationId: string) {
      return request<FirebaseOrganization>(
        `/v1/organizations/${encodeURIComponent(organizationId)}`,
      );
    },
    updateOrganization(
      organizationId: string,
      body: {
        legalName?: string;
        campaignApprovalMode?: "auto_approve" | "require_approval";
      },
    ) {
      return request<FirebaseOrganization>(
        `/v1/organizations/${encodeURIComponent(organizationId)}`,
        { method: "PATCH", body },
      );
    },
    getClientTeamWorkspace(organizationId: string) {
      return request<FirebaseClientTeamWorkspace>(
        `/v1/organizations/${encodeURIComponent(organizationId)}/workspace`,
      );
    },
    listEntitlements(organizationId: string) {
      return request<FirebaseEntitlement[]>(
        `/v1/organizations/${encodeURIComponent(organizationId)}/entitlements`,
      );
    },
    createInvitation(body: {
      organizationId: string;
      email: string;
      role: "hiring_manager" | "client_owner" | "client_admin";
      seatId?: string | null;
      seatNumber?: number | null;
      expiresAt: string;
    }) {
      return request<{
        invitationId: string;
        token: string;
        seatId: string | null;
      }>("/v1/invitations", { method: "POST", body });
    },
    revokeInvitation(invitationId: string) {
      return request<{ alreadyClosed: boolean }>(
        `/v1/invitations/${encodeURIComponent(invitationId)}`,
        { method: "DELETE" },
      );
    },
    revealInvitationAcceptMaterial(invitationId: string) {
      return request<{ token: string; email: string; invitationId: string }>(
        `/v1/invitations/${encodeURIComponent(invitationId)}/accept-material`,
      );
    },
    releaseSeatMembership(organizationId: string, membershipId: string) {
      return request<{ seatId: string | null; alreadyReleased: boolean }>(
        `/v1/organizations/${encodeURIComponent(organizationId)}/memberships/${encodeURIComponent(membershipId)}/release`,
        { method: "POST", body: {} },
      );
    },
    replaceSeatOccupant(
      organizationId: string,
      seatId: string,
      body: { email: string; expiresAt: string },
    ) {
      return request<{
        invitationId: string;
        token: string;
        seatId: string;
      }>(
        `/v1/organizations/${encodeURIComponent(organizationId)}/seats/${encodeURIComponent(seatId)}/replace`,
        { method: "POST", body },
      );
    },
  };
}
