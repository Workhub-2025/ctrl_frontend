import "server-only";

import type {
  AdminAuditLogRow,
  AdminClientCreateResult,
  AdminClientDetails,
  AdminClientEntitlementRow,
  AdminClientRow,
  AdminOverview,
  AdminUserRow,
  AdminUsersSummary,
} from "@/services/admin-platform.service";

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
  seats: ReadonlyArray<{
    id: string;
    organizationId: string;
    seatNumber: number;
    seatLabel: string | null;
    status: "available" | "reserved" | "occupied" | "disabled";
    pendingInvitationId: string | null;
    activeMembershipId: string | null;
  }>;
  memberships: ReadonlyArray<{
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
  invitations: ReadonlyArray<{
    id: string;
    organizationId: string;
    seatId: string | null;
    role: "hiring_manager" | "client_owner" | "client_admin";
    status: "pending" | "accepted" | "revoked" | "expired";
    email: string;
    expiresAt: string;
    createdAt: string;
  }>;
  entitlements: ReadonlyArray<{
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

export type FirebaseDirectoryUser = Readonly<{
  id: string;
  displayName: string;
  email: string;
  accountStatus: "active" | "suspended" | "closed";
  portalRole: "candidate" | "hiring_manager" | "client" | "admin";
  organizationId: string | null;
  organizationName: string | null;
  platformRoles: ReadonlyArray<
    "super_admin" | "support_admin" | "billing_admin" | "operations_admin"
  >;
  createdAt: string;
  updatedAt: string;
}>;

export type FirebaseAssessmentRelease = Readonly<{
  id: string;
  slug: string;
  releaseVersion: string;
  status: string;
  publishedAt: string;
}>;

function clientStatus(
  organization: FirebaseOrganization,
  workspace?: FirebaseClientTeamWorkspace,
): AdminClientRow["status"] {
  if (organization.status === "suspended") return "Paused";
  if (organization.status === "closed") return "Expired";
  const hasClientContact = (workspace?.memberships ?? []).some(
    (membership) =>
      membership.status === "active" &&
      (membership.role === "client_owner" || membership.role === "client_admin"),
  );
  if (!hasClientContact) return "Awaiting signup";
  return "Active";
}

function primaryContact(workspace?: FirebaseClientTeamWorkspace): string {
  const contact = (workspace?.memberships ?? []).find(
    (membership) =>
      membership.status === "active" &&
      (membership.role === "client_owner" || membership.role === "client_admin"),
  );
  if (contact?.displayName) return contact.displayName;
  if (contact?.email) return contact.email;
  const pending = (workspace?.invitations ?? []).find(
    (invitation) =>
      invitation.status === "pending" &&
      (invitation.role === "client_owner" || invitation.role === "client_admin"),
  );
  return pending?.email ?? "No primary contact";
}

function inviteStatus(
  workspace?: FirebaseClientTeamWorkspace,
): AdminClientRow["clientInviteStatus"] {
  const invites = (workspace?.invitations ?? []).filter(
    (invitation) =>
      invitation.role === "client_owner" || invitation.role === "client_admin",
  );
  const latest = [...invites].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  )[0];
  if (!latest) return "none";
  if (latest.status === "pending") return "available";
  if (latest.status === "accepted") return "used";
  if (latest.status === "expired") return "expired";
  if (latest.status === "revoked") return "revoked";
  return "none";
}

export function toAdminClientRow(
  organization: FirebaseOrganization,
  workspace?: FirebaseClientTeamWorkspace,
): AdminClientRow {
  const status = clientStatus(organization, workspace);
  const seatsAllowed = workspace?.seatSummary.limit ?? 0;
  const seatsUsed = workspace?.seatSummary.used ?? 0;
  const hasClientContact = (workspace?.memberships ?? []).some(
    (membership) =>
      membership.status === "active" &&
      (membership.role === "client_owner" || membership.role === "client_admin"),
  );
  const clientInvite = inviteStatus(workspace);
  return {
    id: organization.id,
    name: organization.legalName,
    status,
    plan: "Firebase tenancy",
    seatsUsed,
    seatsAllowed,
    enabledAssessments: [],
    billingStatus: "Not configured",
    primaryContact: primaryContact(workspace),
    lastActivity: organization.updatedAt,
    pendingCampaignApprovals: 0,
    hasClientContact,
    clientInviteStatus: clientInvite,
    clientInviteExpiresAt:
      (workspace?.invitations ?? []).find(
        (invitation) =>
          invitation.status === "pending" &&
          (invitation.role === "client_owner" ||
            invitation.role === "client_admin"),
      )?.expiresAt ?? null,
    canGenerateClientCode:
      !hasClientContact && clientInvite === "none" && status !== "Paused",
  };
}

export function toAdminClientDetails(
  workspace: FirebaseClientTeamWorkspace,
): AdminClientDetails {
  const row = toAdminClientRow(workspace.organization, workspace);
  const seatEntitlement = workspace.entitlements.find(
    (entitlement) =>
      entitlement.entitlementKey === "hiring_manager_seats" &&
      entitlement.status === "active",
  );
  return {
    ...row,
    legalName: workspace.organization.legalName,
    primaryContactName: primaryContact(workspace),
    primaryContactEmail:
      workspace.memberships.find(
        (membership) =>
          membership.status === "active" &&
          (membership.role === "client_owner" ||
            membership.role === "client_admin"),
      )?.email ??
      workspace.invitations.find(
        (invitation) =>
          invitation.status === "pending" &&
          (invitation.role === "client_owner" ||
            invitation.role === "client_admin"),
      )?.email ??
      "No email recorded",
    primaryContactPhone: "No phone recorded",
    address: "No address recorded",
    timeZone: "Europe/London",
    campaignApprovalMode: workspace.organization.campaignApprovalMode,
    onboardingCompleted: workspace.memberships.some(
      (membership) =>
        membership.status === "active" &&
        (membership.role === "client_owner" ||
          membership.role === "client_admin"),
    ),
    createdAt: workspace.organization.createdAt,
    updatedAt: workspace.organization.updatedAt,
    activeContract: seatEntitlement
      ? {
          documentId: seatEntitlement.id,
          status: workspace.organization.status,
          startDate: seatEntitlement.validFrom,
          endDate: seatEntitlement.validUntil,
          seatCount: seatEntitlement.quantity,
          tier: "professional",
          notes: `Source: ${seatEntitlement.source}`,
          paymentStatus: "not_required",
          assessmentDataRetentionMonths: null,
          effectiveAssessmentDataRetentionMonths: 36,
        }
      : null,
    users: workspace.memberships
      .filter((membership) => membership.status === "active")
      .map((membership) => toAdminUserFromMembership(membership, workspace)),
    campaigns: [],
    accessCodes: workspace.invitations.map((invitation) => ({
      id: invitation.id,
      status: invitation.status,
      targetRole:
        invitation.role === "hiring_manager" ? "hiring_manager" : "client",
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
    })),
    features: null,
  };
}

function toAdminUserFromMembership(
  membership: FirebaseClientTeamWorkspace["memberships"][number],
  workspace: FirebaseClientTeamWorkspace,
): AdminUserRow {
  return {
    id: membership.userId,
    name: membership.displayName ?? membership.email ?? "Unnamed user",
    email: membership.email ?? "No email recorded",
    role:
      membership.role === "hiring_manager" ? "Hiring Manager" : "Client Contact",
    client: workspace.organization.legalName,
    status: membership.status === "active" ? "Active" : "Disabled",
    lastLogin: membership.createdAt,
  };
}

export function toAdminClientEntitlementRow(
  workspace: FirebaseClientTeamWorkspace,
): AdminClientEntitlementRow {
  const details = toAdminClientDetails(workspace);
  return {
    ...toAdminClientRow(workspace.organization, workspace),
    activeContract: details.activeContract
      ? {
          documentId: details.activeContract.documentId,
          status: details.activeContract.status,
          startDate: details.activeContract.startDate,
          endDate: details.activeContract.endDate,
          seatCount: details.activeContract.seatCount,
          tier: details.activeContract.tier,
          notes: details.activeContract.notes,
          paymentStatus: details.activeContract.paymentStatus,
        }
      : null,
    features: details.features ?? null,
  };
}

export function toAdminUsersSummary(
  users: readonly FirebaseDirectoryUser[],
): AdminUsersSummary {
  const rows: AdminUserRow[] = users.map((user) => ({
    id: user.id,
    name: user.displayName,
    email: user.email,
    role:
      user.portalRole === "admin"
        ? "CTRL Admin"
        : user.portalRole === "client"
          ? "Client Contact"
          : user.portalRole === "hiring_manager"
            ? "Hiring Manager"
            : "Candidate",
    client: user.organizationName ?? (user.portalRole === "admin" ? "CTRL Internal" : "Unassigned"),
    status:
      user.accountStatus === "active"
        ? "Active"
        : user.accountStatus === "suspended"
          ? "Disabled"
          : "Disabled",
    lastLogin: user.updatedAt,
  }));

  return {
    users: rows,
    totals: {
      all: rows.length,
      ctrlAdmins: rows.filter((row) => row.role === "CTRL Admin").length,
      clientContacts: rows.filter((row) => row.role === "Client Contact").length,
      hiringManagers: rows.filter((row) => row.role === "Hiring Manager").length,
      candidates: rows.filter((row) => row.role === "Candidate").length,
      active: rows.filter((row) => row.status === "Active").length,
      invited: rows.filter((row) => row.status === "Invited").length,
      disabled: rows.filter((row) => row.status === "Disabled").length,
    },
  };
}

export function toAdminOverviewFromOrganizations(
  organizations: readonly FirebaseOrganization[],
  workspaces: readonly FirebaseClientTeamWorkspace[],
): AdminOverview {
  const workspaceById = new Map(
    workspaces.map((workspace) => [workspace.organization.id, workspace]),
  );
  const rows = organizations.map((organization) =>
    toAdminClientRow(organization, workspaceById.get(organization.id)),
  );
  const activeClients = rows.filter((row) => row.status === "Active").length;
  const awaitingClientSignups = rows.filter(
    (row) => row.status === "Awaiting signup",
  ).length;

  return {
    activeClients,
    awaitingClientSignups,
    pendingCampaignApprovals: 0,
    availableClientCodes: rows.filter((row) => row.canGenerateClientCode).length,
    contractsExpiringSoon: 0,
    seatUsage: rows,
    recentActivity: [
      {
        id: "firebase-tenancy-ready",
        title: "Firebase tenancy connected",
        detail: `${organizations.length} organization${organizations.length === 1 ? "" : "s"} visible from Cloud Firestore.`,
      },
    ],
    attentionRequired:
      organizations.length === 0
        ? [
            {
              id: "firebase-no-organizations",
              title: "No organizations yet",
              detail:
                "Create a client from the organizations page. Billing and campaign aggregates remain pending until Wave 5.",
            },
          ]
        : [
            {
              id: "firebase-billing-pending",
              title: "Commercial analytics pending",
              detail:
                "Contracts, invoices and revenue analytics still use the Wave 5 billing path and are not shown here.",
            },
          ],
  };
}

export function toAdminClientCreateResult(
  organizationId: string,
  workspace: FirebaseClientTeamWorkspace,
): AdminClientCreateResult {
  return {
    client: toAdminClientRow(workspace.organization, workspace),
    contract: undefined,
    accessCode: undefined,
  };
}

export function groupAssessmentReleases(
  releases: readonly FirebaseAssessmentRelease[],
): Record<string, Array<{ version: string; title: string; description: string | null }>> {
  const grouped: Record<
    string,
    Array<{ version: string; title: string; description: string | null }>
  > = {};
  for (const release of releases) {
    const bucket = grouped[release.slug] ?? [];
    bucket.push({
      version: release.releaseVersion,
      title: `${release.slug} ${release.releaseVersion}`,
      description: release.status,
    });
    grouped[release.slug] = bucket;
  }
  return grouped;
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

function humanizeAuditToken(value: string): string {
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatAuditTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Maps Firestore per-organization audit events into the admin audit-log row
 * shape the portal already renders. Events are sorted newest-first; platform
 * (org-less) events fall back to a "Platform-wide" client label.
 */
export function toAdminAuditLogRows(
  events: readonly FirebaseAdminAuditEvent[],
  organizationNameById: ReadonlyMap<string, string>,
): AdminAuditLogRow[] {
  return [...events]
    .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
    .map((event) => {
      const resourceLabel = humanizeAuditToken(event.resourceType);
      return {
        id: event.id,
        actor:
          event.actorDisplayName ??
          event.actorUserId ??
          event.actorFirebaseUid ??
          "System",
        timestamp: formatAuditTimestamp(event.occurredAt),
        rawTimestamp: event.occurredAt,
        event: humanizeAuditToken(event.action),
        eventKey: event.action,
        client: event.organizationId
          ? organizationNameById.get(event.organizationId) ?? event.organizationId
          : "Platform-wide",
        resource: resourceLabel,
        resourceLabel: `${resourceLabel} ${event.resourceId.slice(0, 8)}`,
        details: `${humanizeAuditToken(event.action)} on ${resourceLabel}`,
      };
    });
}

export function mapFirebaseRolesToPlatformRoles(input: {
  isSuperAdmin?: boolean;
  roleTypes?: string[];
}): Array<"super_admin" | "support_admin" | "billing_admin" | "operations_admin"> {
  if (input.isSuperAdmin) return ["super_admin"];
  const roles = new Set<
    "super_admin" | "support_admin" | "billing_admin" | "operations_admin"
  >();
  for (const roleType of input.roleTypes ?? []) {
    if (roleType.includes("support")) roles.add("support_admin");
    if (roleType.includes("ops")) roles.add("operations_admin");
    if (roleType.includes("billing")) roles.add("billing_admin");
  }
  return [...roles];
}
