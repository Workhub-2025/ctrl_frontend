import { describe, expect, it } from "vitest";

import {
  toClientAccessCodes,
  toClientDashboardSummary,
  toClientHiringManagers,
} from "@/lib/firebase-tenancy-bff";
import type { FirebaseClientTeamWorkspace } from "@/lib/firebase-tenancy-api";

const workspace: FirebaseClientTeamWorkspace = {
  organization: {
    id: "org-1",
    legalName: "Example Client",
    status: "active",
    campaignApprovalMode: "require_approval",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  seats: [
    {
      id: "seat-1",
      organizationId: "org-1",
      seatNumber: 1,
      seatLabel: "Seat 1",
      status: "occupied",
      pendingInvitationId: null,
      activeMembershipId: "membership-1",
    },
    {
      id: "seat-2",
      organizationId: "org-1",
      seatNumber: 2,
      seatLabel: "Seat 2",
      status: "available",
      pendingInvitationId: null,
      activeMembershipId: null,
    },
  ],
  memberships: [
    {
      id: "membership-1",
      userId: "user-1",
      organizationId: "org-1",
      seatId: "seat-1",
      role: "hiring_manager",
      status: "active",
      displayName: "Ada Manager",
      email: "ada@example.test",
      createdAt: "2026-01-01T00:00:00.000Z",
      revokedAt: null,
    },
    {
      id: "membership-2",
      userId: "user-2",
      organizationId: "org-1",
      seatId: null,
      role: "client_owner",
      status: "active",
      displayName: "Client Owner",
      email: "owner@example.test",
      createdAt: "2026-01-01T00:00:00.000Z",
      revokedAt: null,
    },
  ],
  invitations: [],
  entitlements: [
    {
      id: "org-1_hiring_manager_seats",
      organizationId: "org-1",
      entitlementKey: "hiring_manager_seats",
      quantity: 2,
      source: "administrator",
      status: "active",
      validFrom: "2026-01-01T00:00:00.000Z",
      validUntil: null,
    },
  ],
  seatSummary: {
    limit: 2,
    used: 1,
    available: 1,
    reserved: 0,
  },
};

describe("Firebase client team workspace adapters", () => {
  it("projects hiring managers from memberships and seats", () => {
    expect(toClientHiringManagers(workspace)).toEqual([
      expect.objectContaining({
        documentId: "membership-1",
        name: "Ada Manager",
        status: "active",
        seatNumber: 1,
      }),
    ]);
  });

  it("projects available seats as access-code slots", () => {
    const codes = toClientAccessCodes(workspace);
    expect(codes).toEqual([
      expect.objectContaining({
        documentId: "seat-2",
        status: "available",
        seatNumber: 2,
      }),
    ]);
  });

  it("projects seat entitlement into the client dashboard summary", () => {
    expect(toClientDashboardSummary(workspace)).toMatchObject({
      client: {
        documentId: "org-1",
        campaignApprovalMode: "require_approval",
      },
      seats: { limit: 2, used: 1, available: 1 },
      activeContract: {
        seatCount: 2,
        status: "active",
      },
    });
  });
});
