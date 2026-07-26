import "server-only";

import type { FirebaseClientTeamWorkspace } from "@/lib/firebase-tenancy-api";
import { createFirebaseTenancyApi } from "@/lib/firebase-tenancy-api";
import type { ReturnTypeOfCreateFirebaseDomainApi } from "@/lib/firebase-domain-api-types";

export type AdminSeatSlot = Readonly<{
  seatNumber: number;
  seatLabel: string;
  managerName: string | null;
  managerEmail: string | null;
  managerStatus: "occupied" | "empty" | "previous";
  seatId: string;
  membershipId: string | null;
}>;

type DomainRequester = Pick<ReturnTypeOfCreateFirebaseDomainApi, "request">;

function membershipBySeatId(workspace: FirebaseClientTeamWorkspace) {
  const map = new Map<string, FirebaseClientTeamWorkspace["memberships"][number]>();
  for (const membership of workspace.memberships) {
    if (
      membership.status === "active" &&
      membership.seatId &&
      membership.role === "hiring_manager"
    ) {
      map.set(membership.seatId, membership);
    }
  }
  return map;
}

export function seatSlotsFromWorkspace(
  workspace: FirebaseClientTeamWorkspace,
): AdminSeatSlot[] {
  const bySeat = membershipBySeatId(workspace);
  return [...workspace.seats]
    .filter((seat) => seat.status !== "disabled")
    .sort((left, right) => left.seatNumber - right.seatNumber)
    .map((seat) => {
      const membership = bySeat.get(seat.id);
      if (membership) {
        return {
          seatNumber: seat.seatNumber,
          seatLabel: seat.seatLabel ?? `Seat ${seat.seatNumber}`,
          managerName: membership.displayName,
          managerEmail: membership.email,
          managerStatus: "occupied" as const,
          seatId: seat.id,
          membershipId: membership.id,
        };
      }
      if (seat.status === "reserved" && seat.pendingInvitationId) {
        const invitation = workspace.invitations.find(
          (row) => row.id === seat.pendingInvitationId,
        );
        return {
          seatNumber: seat.seatNumber,
          seatLabel: seat.seatLabel ?? `Seat ${seat.seatNumber}`,
          managerName: null,
          managerEmail: invitation?.email ?? null,
          managerStatus: "empty" as const,
          seatId: seat.id,
          membershipId: null,
        };
      }
      return {
        seatNumber: seat.seatNumber,
        seatLabel: seat.seatLabel ?? `Seat ${seat.seatNumber}`,
        managerName: null,
        managerEmail: null,
        managerStatus: "empty" as const,
        seatId: seat.id,
        membershipId: null,
      };
    });
}

/**
 * Workflow token for Preview seat export → deactivate. Encodes org + seats +
 * issue time so downgrade can verify without a separate CMS export store.
 * Admin auth is the real gate; this only enforces the UI two-step flow.
 */
export function createSeatExportReference(
  organizationId: string,
  seatNumbers: readonly number[],
): string {
  const payload = {
    v: 1,
    o: organizationId,
    s: [...seatNumbers].sort((a, b) => a - b),
    t: Date.now(),
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function assertSeatExportReference(
  organizationId: string,
  exportReferenceId: string,
  seatNumbers: readonly number[],
): void {
  let parsed: { v?: number; o?: string; s?: number[]; t?: number };
  try {
    parsed = JSON.parse(
      Buffer.from(exportReferenceId, "base64url").toString("utf8"),
    ) as typeof parsed;
  } catch {
    throw new Error("Export reference is invalid");
  }
  if (parsed.v !== 1 || parsed.o !== organizationId) {
    throw new Error("Export reference does not match this client");
  }
  const expected = [...seatNumbers].sort((a, b) => a - b).join(",");
  const actual = [...(parsed.s ?? [])].sort((a, b) => a - b).join(",");
  if (expected !== actual) {
    throw new Error("Export reference does not match selected seats");
  }
  const issuedAt = Number(parsed.t ?? 0);
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > 24 * 60 * 60 * 1000) {
    throw new Error("Export reference has expired; export seats again");
  }
}

export async function loadAdminSeatSlots(
  domainApi: DomainRequester,
  firebaseSessionCookie: string,
  organizationId: string,
) {
  const tenancy = createFirebaseTenancyApi(domainApi, firebaseSessionCookie);
  const workspace = await tenancy.getClientTeamWorkspace(organizationId);
  return {
    workspace,
    slots: seatSlotsFromWorkspace(workspace),
  };
}

export async function exportAdminSeats(input: {
  domainApi: DomainRequester;
  firebaseSessionCookie: string;
  organizationId: string;
  seatNumbers: number[];
  adminEmail: string | null | undefined;
}) {
  if (input.seatNumbers.length === 0) {
    throw new Error("seatNumbers must include at least one valid seat");
  }
  const { slots } = await loadAdminSeatSlots(
    input.domainApi,
    input.firebaseSessionCookie,
    input.organizationId,
  );
  const selected = input.seatNumbers.map((seatNumber) => {
    const slot = slots.find((row) => row.seatNumber === seatNumber);
    if (!slot) {
      throw new Error(`Seat ${seatNumber} was not found`);
    }
    return slot;
  });
  const exportReferenceId = createSeatExportReference(
    input.organizationId,
    input.seatNumbers,
  );
  const emailedAt = new Date().toISOString();
  return {
    exportReferenceId,
    clientDocumentId: input.organizationId,
    seatNumbers: selected.map((slot) => slot.seatNumber),
    clientEmails: [] as string[],
    adminEmail: input.adminEmail ?? null,
    emailedAt,
    notice:
      "Seat export recorded for Firebase Preview. Email delivery still depends on SMTP rotation.",
  };
}

export async function downgradeAdminSeats(input: {
  domainApi: DomainRequester;
  firebaseSessionCookie: string;
  organizationId: string;
  seatNumbers: number[];
  exportReferenceId: string;
  newSeatCount: number;
}) {
  assertSeatExportReference(
    input.organizationId,
    input.exportReferenceId,
    input.seatNumbers,
  );
  if (!Number.isInteger(input.newSeatCount) || input.newSeatCount < 1) {
    throw new Error("newSeatCount must be at least 1");
  }

  const tenancy = createFirebaseTenancyApi(
    input.domainApi,
    input.firebaseSessionCookie,
  );
  const workspace = await tenancy.getClientTeamWorkspace(input.organizationId);
  const slots = seatSlotsFromWorkspace(workspace);
  const currentSeatCount = workspace.seatSummary.limit;
  if (input.newSeatCount !== currentSeatCount - input.seatNumbers.length) {
    throw new Error(
      `newSeatCount must equal current allocation minus removed seats (${currentSeatCount - input.seatNumbers.length})`,
    );
  }

  for (const seatNumber of [...input.seatNumbers].sort((a, b) => a - b)) {
    const slot = slots.find((row) => row.seatNumber === seatNumber);
    if (!slot) {
      throw new Error(`Seat ${seatNumber} was not found`);
    }
    if (slot.membershipId) {
      await tenancy.releaseSeatMembership(
        input.organizationId,
        slot.membershipId,
      );
    } else if (slot.seatId) {
      const seat = workspace.seats.find((row) => row.id === slot.seatId);
      if (seat?.pendingInvitationId) {
        await tenancy.revokeInvitation(seat.pendingInvitationId);
      }
    }
  }

  await input.domainApi.request({
    path: `/v1/organizations/${encodeURIComponent(input.organizationId)}/entitlements/hiring-manager-seats`,
    method: "PUT",
    firebaseSessionCookie: input.firebaseSessionCookie,
    body: { quantity: input.newSeatCount },
  });

  return {
    clientDocumentId: input.organizationId,
    seatNumbers: input.seatNumbers,
    newSeatCount: input.newSeatCount,
    success: true,
  };
}

export async function downgradeAdminSeat(input: {
  domainApi: DomainRequester;
  firebaseSessionCookie: string;
  organizationId: string;
  managerDocumentId?: string;
  accessCodeDocumentId?: string;
}) {
  if (!input.managerDocumentId && !input.accessCodeDocumentId) {
    throw new Error("managerDocumentId or accessCodeDocumentId is required");
  }

  const tenancy = createFirebaseTenancyApi(
    input.domainApi,
    input.firebaseSessionCookie,
  );
  const workspace = await tenancy.getClientTeamWorkspace(input.organizationId);
  const membership =
    workspace.memberships.find(
      (row) =>
        row.status === "active" &&
        row.role === "hiring_manager" &&
        (row.userId === input.managerDocumentId ||
          row.id === input.managerDocumentId),
    ) ??
    workspace.memberships.find(
      (row) =>
        row.status === "active" &&
        row.role === "hiring_manager" &&
        row.seatId &&
        workspace.seats.some(
          (seat) =>
            seat.id === row.seatId &&
            seat.pendingInvitationId === input.accessCodeDocumentId,
        ),
    );

  if (input.accessCodeDocumentId && !membership) {
    const invitation = workspace.invitations.find(
      (row) => row.id === input.accessCodeDocumentId,
    );
    if (invitation) {
      await tenancy.revokeInvitation(invitation.id);
    }
  } else if (membership) {
    await tenancy.releaseSeatMembership(input.organizationId, membership.id);
  } else {
    throw new Error("Hiring manager seat was not found");
  }

  const newSeatCount = Math.max(1, workspace.seatSummary.limit - 1);
  await input.domainApi.request({
    path: `/v1/organizations/${encodeURIComponent(input.organizationId)}/entitlements/hiring-manager-seats`,
    method: "PUT",
    firebaseSessionCookie: input.firebaseSessionCookie,
    body: { quantity: newSeatCount },
  });

  return {
    clientDocumentId: input.organizationId,
    managerDocumentId: membership?.userId ?? input.managerDocumentId ?? null,
    accessCodeDocumentId: input.accessCodeDocumentId ?? null,
    newSeatCount,
    success: true,
  };
}
