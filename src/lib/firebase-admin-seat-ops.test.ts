import { describe, expect, it } from "vitest";

import {
  assertSeatExportReference,
  createSeatExportReference,
  seatSlotsFromWorkspace,
  type AdminSeatSlot,
} from "@/lib/firebase-admin-seat-ops";
import type { FirebaseClientTeamWorkspace } from "@/lib/firebase-tenancy-api";

function workspaceFixture(): FirebaseClientTeamWorkspace {
  return {
    organization: {
      id: "org-1",
      legalName: "Acme",
      status: "active",
      campaignApprovalMode: "auto_approve",
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
        activeMembershipId: "mem-1",
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
        id: "mem-1",
        userId: "user-1",
        organizationId: "org-1",
        seatId: "seat-1",
        role: "hiring_manager",
        status: "active",
        displayName: "Ada",
        email: "ada@example.com",
        createdAt: "2026-01-01T00:00:00.000Z",
        revokedAt: null,
      },
    ],
    invitations: [],
    entitlements: [
      {
        id: "ent-1",
        organizationId: "org-1",
        entitlementKey: "hiring_manager_seats",
        quantity: 2,
        source: "contract",
        status: "active",
        validFrom: "2026-01-01T00:00:00.000Z",
        validUntil: null,
      },
    ],
    seatSummary: { limit: 2, used: 1, available: 1, reserved: 0 },
  };
}

describe("firebase-admin-seat-ops", () => {
  it("maps workspace seats into admin seat slots", () => {
    const slots: AdminSeatSlot[] = seatSlotsFromWorkspace(workspaceFixture());
    expect(slots).toHaveLength(2);
    expect(slots[0]).toMatchObject({
      seatNumber: 1,
      managerStatus: "occupied",
      managerEmail: "ada@example.com",
      membershipId: "mem-1",
    });
    expect(slots[1]).toMatchObject({
      seatNumber: 2,
      managerStatus: "empty",
      membershipId: null,
    });
  });

  it("round-trips seat export references for the same seats", () => {
    const reference = createSeatExportReference("org-1", [3, 1]);
    expect(() =>
      assertSeatExportReference("org-1", reference, [1, 3]),
    ).not.toThrow();
    expect(() =>
      assertSeatExportReference("org-1", reference, [1, 2]),
    ).toThrow(/does not match selected seats/);
  });
});
