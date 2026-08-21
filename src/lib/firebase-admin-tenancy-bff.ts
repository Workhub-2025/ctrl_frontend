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
} from "@/types/admin-platform";
import type { FirebaseAdminOverviewOrganizationCard } from "@/lib/firebase-screen-api";
import { contractTierInclusions } from "@/lib/client/contract-tier-inclusions";
import {
  mapPlatformRolesToAdminPortalRole,
  type AdminPortalRoleType,
} from "@/lib/auth/admin-portal-permissions";

export type { AdminPortalRoleType };
export { mapPlatformRolesToAdminPortalRole };

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
  lastSignInAt?: string | null;
}>;

export type FirebaseAssessmentRelease = Readonly<{
  id: string;
  slug: string;
  releaseVersion: string;
  status: string;
  publishedAt: string;
}>;

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

const TIER_LABELS: Record<string, string> = {
  essential: "Essential",
  professional: "Professional",
  founder: "Founder",
};

type ContractHint = {
  id?: string;
  documentId?: string;
  tier?: string;
  status: string;
  seatCount?: number;
  startDate?: string | null;
  endDate?: string | null;
  paymentStatus?: string;
} | null;

export function formatAdminTimestamp(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function contractPlanLabel(tier?: string | null): string {
  if (!tier) return "No contract";
  return (
    TIER_LABELS[tier] ??
    tier.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export function mapContractBillingStatus(
  status?: string | null,
): AdminClientRow["billingStatus"] {
  const value = (status ?? "").toLowerCase();
  if (value === "active") return "Active";
  if (value === "expired" || value === "canceled" || value === "cancelled") {
    return "Expired";
  }
  if (value === "paused" || value === "suspended" || value === "soft_locked") {
    return "Paused";
  }
  return "Not configured";
}

function mapOnboardingStatus(
  organizationStatus: string | undefined,
  hasClientContact: boolean,
  contractStatus: string | null | undefined,
): AdminClientRow["status"] {
  if (organizationStatus === "suspended") return "Paused";
  if (organizationStatus === "closed") return "Expired";
  if (!hasClientContact) return "Awaiting signup";
  if (!contractStatus) return "Needs contract";
  if (contractStatus === "draft" || contractStatus === "pending_payment") {
    return "Awaiting payment";
  }
  if (contractStatus === "expired") return "Expired";
  return "Active";
}

function mapInviteStatus(
  value?: string | null,
): AdminClientRow["clientInviteStatus"] {
  if (value === "pending") return "available";
  if (value === "accepted") return "used";
  if (value === "expired") return "expired";
  if (value === "revoked") return "revoked";
  if (value === "available" || value === "used" || value === "none") return value;
  return "none";
}

export function preferredContract<T extends { status: string; endDate?: string | null }>(
  contracts: readonly T[],
): T | null {
  const rank = (status: string) => {
    if (status === "active") return 0;
    if (status === "pending_payment") return 1;
    if (status === "draft") return 2;
    if (status === "expired") return 3;
    return 4;
  };
  const sorted = [...contracts].sort((left, right) => {
    const byRank = rank(left.status) - rank(right.status);
    if (byRank !== 0) return byRank;
    return (right.endDate ?? "").localeCompare(left.endDate ?? "");
  });
  return sorted[0] ?? null;
}

export function toAdminClientRowFromOverviewCard(
  org: FirebaseAdminOverviewOrganizationCard,
): AdminClientRow {
  const hasClientContact = org.hasClientContact ?? true;
  const invite = mapInviteStatus(org.clientInviteStatus);
  const status = mapOnboardingStatus(
    org.status,
    hasClientContact,
    org.contractSummary?.status,
  );
  return {
    id: org.id,
    name: org.legalName,
    status,
    plan: contractPlanLabel(org.contractSummary?.tier),
    seatsUsed: org.activeSeats,
    seatsAllowed: org.contractSummary?.seatCount ?? org.activeSeats,
    enabledAssessments: [],
    billingStatus: mapContractBillingStatus(org.contractSummary?.status),
    primaryContact:
      org.primaryContactName ||
      org.primaryContactEmail ||
      (hasClientContact ? "Client contact" : "No primary contact"),
    lastActivity: formatAdminTimestamp(org.updatedAt),
    pendingCampaignApprovals: org.pendingUpgradesCount,
    hasClientContact,
    clientInviteStatus: invite,
    clientInviteExpiresAt: org.clientInviteExpiresAt ?? null,
    canGenerateClientCode:
      !hasClientContact && invite === "none" && status !== "Paused",
  };
}

export function toAdminEntitlementRowsFromScreen(
  screen:
    | { organizations?: readonly FirebaseAdminOverviewOrganizationCard[] }
    | null
    | undefined,
): AdminClientEntitlementRow[] {
  return (screen?.organizations ?? []).map((org) => {
    const row = toAdminClientRowFromOverviewCard(org);
    const inclusions = contractTierInclusions(org.contractSummary?.tier);
    return {
      ...row,
      activeContract: org.contractSummary
        ? {
            documentId: org.contractSummary.id ?? org.id,
            status: org.contractSummary.status,
            startDate: org.contractSummary.startDate,
            endDate: org.contractSummary.endDate,
            seatCount: org.contractSummary.seatCount,
            tier: org.contractSummary.tier ?? "professional",
            notes: "",
            paymentStatus: org.contractSummary.paymentStatus ?? "not_required",
          }
        : null,
      features: {
        deliveryRemote:
          org.features?.deliveryRemote === true || inclusions.deliveryRemote,
        deliveryHybrid:
          org.features?.deliveryHybrid === true || inclusions.deliveryHybrid,
        assessmentRecovery: org.features?.assessmentRecovery === true,
        additionalAssessmentSlugs: [
          ...(org.features?.additionalAssessmentSlugs ?? []),
        ],
      },
    };
  });
}

export function toAdminClientRow(
  organization: FirebaseOrganization,
  workspace?: FirebaseClientTeamWorkspace,
  contract?: ContractHint,
): AdminClientRow {
  const seatsAllowed =
    contract?.seatCount ?? workspace?.seatSummary.limit ?? 0;
  const seatsUsed = workspace?.seatSummary.used ?? 0;
  const hasClientContact = (workspace?.memberships ?? []).some(
    (membership) =>
      membership.status === "active" &&
      (membership.role === "client_owner" || membership.role === "client_admin"),
  );
  const clientInvite = inviteStatus(workspace);
  const status = mapOnboardingStatus(
    organization.status,
    hasClientContact,
    contract?.status,
  );
  return {
    id: organization.id,
    name: organization.legalName,
    status,
    plan: contractPlanLabel(contract?.tier),
    seatsUsed,
    seatsAllowed,
    enabledAssessments: [],
    billingStatus: mapContractBillingStatus(contract?.status),
    primaryContact: primaryContact(workspace),
    lastActivity: formatAdminTimestamp(organization.updatedAt),
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
  contract?: ContractHint,
): AdminClientDetails {
  const row = toAdminClientRow(workspace.organization, workspace, contract);
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
    activeContract: contract
      ? {
          documentId: contract.documentId ?? contract.id ?? workspace.organization.id,
          status: contract.status,
          startDate: contract.startDate ?? null,
          endDate: contract.endDate ?? null,
          seatCount: contract.seatCount ?? seatEntitlement?.quantity ?? 0,
          tier: contract.tier ?? "professional",
          notes: "",
          paymentStatus: contract.paymentStatus ?? "not_required",
          assessmentDataRetentionMonths: null,
          effectiveAssessmentDataRetentionMonths: 36,
        }
      : seatEntitlement
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
    lastLogin: formatAdminTimestamp(membership.createdAt),
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

function directoryUserStatus(
  user: FirebaseDirectoryUser,
): AdminUserRow["status"] {
  if (user.accountStatus === "suspended" || user.accountStatus === "closed") {
    return "Disabled";
  }
  if (user.lastSignInAt === undefined) {
    return user.accountStatus === "active" ? "Active" : "Disabled";
  }
  if (!user.lastSignInAt) return "Invited";
  return "Active";
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
    status: directoryUserStatus(user),
    lastLogin:
      user.lastSignInAt === undefined
        ? formatAdminTimestamp(user.updatedAt)
        : user.lastSignInAt
          ? formatAdminTimestamp(user.lastSignInAt)
          : "Never",
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
    recentActivity: rows.slice(0, 5).map((row) => ({
      id: row.id,
      title: row.name,
      detail: `${row.plan} · ${row.billingStatus}`,
    })),
    attentionRequired:
      organizations.length === 0
        ? [
            {
              id: "no-organizations",
              title: "No organisations yet",
              detail: "Create a client from the organisations page.",
            },
          ]
        : rows
            .filter(
              (row) =>
                row.status === "Awaiting signup" ||
                row.status === "Needs contract" ||
                row.status === "Awaiting payment",
            )
            .slice(0, 5)
            .map((row) => ({
              id: `${row.id}-attention`,
              title: row.name,
              detail: row.status,
            })),
  };
}

export function toAdminOverviewFromScreen(
  screen: {
    organizations?: readonly FirebaseAdminOverviewOrganizationCard[];
    totalOrganizations?: number;
  } | null | undefined,
): AdminOverview {
  const organizations = screen?.organizations ?? [];
  const totalOrganizations = screen?.totalOrganizations ?? organizations.length;
  const rows = organizations.map(toAdminClientRowFromOverviewCard);
  const now = Date.now();
  const sixtyDays = 60 * 24 * 60 * 60 * 1000;

  return {
    activeClients: rows.filter((row) => row.status === "Active").length,
    awaitingClientSignups: rows.filter((row) => row.status === "Awaiting signup")
      .length,
    pendingCampaignApprovals: organizations.reduce(
      (sum, org) => sum + org.pendingUpgradesCount,
      0,
    ),
    availableClientCodes: rows.filter((row) => row.canGenerateClientCode).length,
    contractsExpiringSoon: organizations.filter((org) => {
      if (org.contractSummary?.status !== "active" || !org.contractSummary.endDate) {
        return false;
      }
      const end = Date.parse(org.contractSummary.endDate);
      return !Number.isNaN(end) && end >= now && end <= now + sixtyDays;
    }).length,
    seatUsage: rows,
    recentActivity: rows.slice(0, 5).map((row) => ({
      id: row.id,
      title: row.name,
      detail: `${row.plan} · ${row.billingStatus}`,
    })),
    attentionRequired:
      totalOrganizations === 0
        ? [
            {
              id: "no-organizations",
              title: "No organisations yet",
              detail: "Create a client from the organisations page.",
            },
          ]
        : rows
            .filter(
              (row) =>
                row.status === "Awaiting signup" ||
                row.status === "Needs contract" ||
                row.status === "Awaiting payment",
            )
            .slice(0, 5)
            .map((row) => ({
              id: `${row.id}-attention`,
              title: row.name,
              detail: row.status,
            })),
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
 * Maps per-organization persistence audit events into the admin audit-log row
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

// mapPlatformRolesToAdminPortalRole lives in admin-portal-permissions (shared
// with browser session priming). Re-exported above for tenancy callers.
