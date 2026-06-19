import "server-only";

import { getStrapiApiBaseUrl, joinStrapiApiPath } from "@/lib/strapi-server";

class AdminStrapiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminStrapiRequestError";
    this.status = status;
  }
}

export function getStrapiErrorStatus(error: unknown) {
  if (error instanceof AdminStrapiRequestError) return error.status;
  return null;
}

async function adminStrapiRequest<T>(
  path: string,
  init?: RequestInit,
  authToken?: string | null
): Promise<T> {
  if (!authToken) throw new Error("Authenticated admin session is required");

  const response = await fetch(
    joinStrapiApiPath(getStrapiApiBaseUrl(), path),
    {
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        ...init?.headers,
      },
    }
  );

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body?.error?.message || body?.error || `Strapi responded ${response.status}`;
    throw new AdminStrapiRequestError(message, response.status);
  }

  return body as T;
}

type StrapiListResponse<T> = {
  data?: T[];
};

type RawRole = {
  type?: string;
  name?: string;
};

type RawAssessmentVersion = {
  version?: string;
  title?: string;
  description?: string | null;
};

type AssessmentVersionsResponse = {
  data?: RawAssessmentVersion[];
};

export type AdminAssessmentVersionOption = {
  version: string;
  title: string;
  description: string | null;
};

type RawUser = {
  id?: number;
  documentId?: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string;
  email?: string;
  blocked?: boolean;
  confirmed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  role?: RawRole;
  client?: Pick<RawClient, "documentId" | "name"> | null;
};

type RawContract = {
  documentId?: string;
  seatCount?: number;
  status?: "active" | "soft_locked" | "pending_deletion";
  startDate?: string | null;
  endDate?: string | null;
  paymentStatus?: "not_required" | "pending" | "paid" | "failed";
  tier?: "minimum" | "professional" | "grandfather" | "grandfather_founders" | "professional_gf" | string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type RawClient = {
  id?: number;
  documentId?: string;
  name?: string;
  legalName?: string | null;
  officeAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  timeZone?: string | null;
  primaryContactEmail?: string;
  primaryContactName?: string;
  primaryContactPhone?: string | null;
  campaignApprovalMode?: "auto_approve" | "require_approval";
  softLockedAt?: string | null;
  onboardingCompleted?: boolean;
  createdAt?: string;
  contracts?: RawContract[];
  users?: RawUser[];
  campaigns?: Array<{
    documentId?: string;
    title?: string;
    name?: string;
    approvalStatus?: "pending" | "approved" | "rejected";
    status?: string;
    createdAt?: string;
  }>;
  access_codes?: Array<{
    documentId?: string;
    status?: string;
    targetRole?: string;
    expiresAt?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
  updatedAt?: string;
  features?: Record<string, any> | null;
};

export type AdminClientRow = {
  id: string;
  name: string;
  status: "Active" | "Awaiting signup" | "Awaiting payment" | "Paused" | "Expired" | "Needs contract";
  plan: string;
  seatsUsed: number;
  seatsAllowed: number;
  enabledAssessments: string[];
  billingStatus: "Active" | "Not configured" | "Expired" | "Paused";
  primaryContact: string;
  lastActivity: string;
  pendingCampaignApprovals: number;
  hasClientContact: boolean;
  clientInviteStatus: "none" | "available" | "used" | "expired" | "revoked";
  clientInviteExpiresAt: string | null;
  canGenerateClientCode: boolean;
};

export type AdminOverview = {
  activeClients: number;
  awaitingClientSignups: number;
  pendingCampaignApprovals: number;
  availableClientCodes: number;
  contractsExpiringSoon: number;
  seatUsage: AdminClientRow[];
  recentActivity: Array<{
    id: string;
    title: string;
    detail: string;
  }>;
  attentionRequired: Array<{
    id: string;
    title: string;
    detail: string;
  }>;
};

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: "CTRL Admin" | "Client Contact" | "Hiring Manager" | "Candidate";
  client: string;
  status: "Active" | "Invited" | "Disabled";
  lastLogin: string;
};

export type AdminUsersSummary = {
  users: AdminUserRow[];
  totals: {
    all: number;
    ctrlAdmins: number;
    clientContacts: number;
    hiringManagers: number;
    candidates: number;
    active: number;
    invited: number;
    disabled: number;
  };
};

export type AdminClientEntitlementRow = AdminClientRow & {
  activeContract: {
    documentId: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    seatCount: number;
    notes: string;
    paymentStatus?: string;
  } | null;
  features?: Record<string, any> | null;
};

export type AdminAuditLogRow = {
  id: string;
  actor: string;
  actorRole?: string;
  timestamp: string;
  rawTimestamp?: string;
  event: string;
  eventKey?: string;
  client: string;
  resource?: string;
  resourceLabel?: string;
  details: string;
};

export type AdminClientCreateInput = {
  name: string;
  legalName?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  officeAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  timeZone?: string;
  campaignApprovalMode: "auto_approve" | "require_approval";
  contract: {
    tier: "minimum" | "professional" | "grandfather";
    seatCount: number;
    notes?: string;
    grandfatherStartedAt?: string | null;
    grandfatherEndsAt?: string | null;
    grandfatherDiscountPercent?: number | null;
  };
  issueAccessCode?: boolean;
};

export type AdminClientCreateResult = {
  client: AdminClientRow;
  contract?: RawContract;
  accessCode?: {
    documentId: string;
    code: string;
    expiresAt: string;
    status: string;
    targetRole: string;
  };
};

export type AdminClientDetails = AdminClientRow & {
  legalName: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  address: string;
  timeZone: string;
  campaignApprovalMode: "auto_approve" | "require_approval";
  onboardingCompleted: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  activeContract: {
    documentId: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    seatCount: number;
    notes: string;
    paymentStatus?: string;
  } | null;
  users: AdminUserRow[];
  campaigns: Array<{
    id: string;
    title: string;
    status: string;
    approvalStatus: string;
    createdAt: string | null;
  }>;
  accessCodes: Array<{
    id: string;
    status: string;
    targetRole: string;
    expiresAt: string | null;
    createdAt: string | null;
  }>;
  features?: Record<string, any> | null;
};

export type AdminClientAccessCodeResult = {
  documentId: string;
  code: string;
  expiresAt: string;
  status: string;
  targetRole: string;
  invitedEmail?: string;
};

type RawAuditLog = {
  id?: number;
  documentId?: string;
  actorUserId?: string;
  actorRole?: string;
  actionType?: string;
  resource?: string;
  resourceId?: string;
  metadata?: Record<string, unknown> | null;
  occurredAt?: string;
  createdAt?: string;
  actorDisplayName?: string;
  clientDisplayName?: string | null;
  resourceDisplayName?: string | null;
  metadataResolved?: Record<string, string>;
};

function isActiveContract(contract?: RawContract) {
  if (!contract || contract.status !== "active") return false;
  const paymentStatus = contract.paymentStatus ?? "not_required";
  if (paymentStatus === "pending" || paymentStatus === "failed") return false;
  if (!contract.startDate || !contract.endDate) return false;
  const today = Date.now();
  return (
    new Date(contract.endDate).getTime() >= today &&
    new Date(contract.startDate).getTime() <= today
  );
}

function getPendingContract(client: RawClient) {
  return (
    (client.contracts ?? []).find(
      (contract) =>
        contract.status === "active" &&
        (contract.paymentStatus === "pending" || (!contract.startDate && !contract.endDate))
    ) ?? null
  );
}

function getActiveContract(client: RawClient) {
  return (client.contracts ?? []).find(isActiveContract) ?? null;
}

function getLatestContract(client: RawClient) {
  return [...(client.contracts ?? [])].sort((a, b) => {
    const aTime = new Date(a.endDate ?? a.updatedAt ?? a.createdAt ?? 0).getTime();
    const bTime = new Date(b.endDate ?? b.updatedAt ?? b.createdAt ?? 0).getTime();
    return bTime - aTime;
  })[0] ?? null;
}

function contractTierLabel(tier?: RawContract["tier"]) {
  switch (tier) {
    case "minimum":
      return "Minimum";
    case "professional":
      return "Professional";
    case "grandfather":
      return "Grandfather";
    case "grandfather_founders":
      return "Grandfather - Founders";
    case "professional_gf":
      return "Professional (GF)";
    default:
      return "No contract";
  }
}

function getLatestAccessCode(
  codes: RawClient["access_codes"],
  targetRole: "client" | "hiring_manager" | "candidate"
) {
  return [...(codes ?? [])]
    .filter((code) => code.targetRole === targetRole)
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return bTime - aTime;
    })[0] ?? null;
}

function roleValue(role?: RawRole) {
  return (role?.type || role?.name || "").toLowerCase().replace(/[-\s]+/g, "_");
}

function roleMatches(role: RawRole | undefined, expected: string) {
  return roleValue(role) === expected;
}

function userDisplayName(user?: RawUser) {
  if (!user) return "";
  return [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    user.email ||
    "";
}

function relativeDate(value?: string) {
  if (!value) return "No activity recorded";
  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return "Recently";
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function normalizeClient(client: RawClient): AdminClientRow {
  const activeContract = getActiveContract(client);
  const pendingContract = getPendingContract(client);
  const latestContract = getLatestContract(client);
  const displayContract = activeContract ?? pendingContract ?? latestContract;
  const contractForSeats = activeContract ?? pendingContract;
  const hasActiveContract = isActiveContract(activeContract ?? undefined);
  const seatsAllowed = contractForSeats?.seatCount ?? 0;
  const seatsUsed = (client.users ?? []).filter(
    (user) => !user.blocked && roleMatches(user.role, "hiring_manager")
  ).length;
  const hasClientContact = (client.users ?? []).some(
    (user) => !user.blocked && (roleMatches(user.role, "client") || roleMatches(user.role, "client_contact"))
  );
  const clientContact = (client.users ?? []).find(
    (user) => !user.blocked && (roleMatches(user.role, "client") || roleMatches(user.role, "client_contact"))
  );
  const latestClientInvite = getLatestAccessCode(client.access_codes, "client");
  const availableClientInvite =
    latestClientInvite?.status === "available" ? latestClientInvite : null;
  const pendingCampaignApprovals = (client.campaigns ?? []).filter(
    (campaign) => campaign.approvalStatus === "pending"
  ).length;
  const status = client.softLockedAt
    ? "Paused"
    : !activeContract && pendingContract
      ? "Awaiting payment"
      : !activeContract && !pendingContract
        ? "Needs contract"
        : !hasActiveContract
          ? "Expired"
          : hasClientContact
            ? "Active"
            : "Awaiting signup";
  const billingStatus =
    status === "Paused"
      ? "Paused"
      : status === "Awaiting payment"
        ? "Not configured"
        : activeContract && hasActiveContract
          ? "Active"
          : activeContract
            ? "Expired"
            : "Not configured";

  return {
    id: client.documentId ?? String(client.id ?? `client-${client.name ?? "unknown"}`),
    name: client.name ?? "Unnamed client",
    status,
    plan: contractTierLabel(displayContract?.tier),
    seatsUsed,
    seatsAllowed,
    enabledAssessments: ["Typing", "SJT", "Prioritisation", "Call Simulation"],
    billingStatus,
    primaryContact:
      client.primaryContactEmail ||
      client.primaryContactName ||
      clientContact?.email ||
      userDisplayName(clientContact) ||
      "No primary contact",
    lastActivity: relativeDate(client.updatedAt),
    pendingCampaignApprovals,
    hasClientContact,
    clientInviteStatus:
      (latestClientInvite?.status as AdminClientRow["clientInviteStatus"] | undefined) ?? "none",
    clientInviteExpiresAt: latestClientInvite?.expiresAt ?? null,
    canGenerateClientCode: !hasClientContact && !availableClientInvite && status !== "Paused",
  };
}

function formatAddress(client: RawClient) {
  return [client.officeAddress, client.city, client.state, client.zipCode]
    .filter(Boolean)
    .join(", ") || "No address recorded";
}

function normalizeClientDetails(client: RawClient): AdminClientDetails {
  const row = normalizeClient(client);
  const activeContract = getActiveContract(client);
  const pendingContract = getPendingContract(client);
  const displayContract = activeContract ?? pendingContract;

  return {
    ...row,
    legalName: client.legalName || "No legal name recorded",
    primaryContactName: client.primaryContactName || "No primary contact",
    primaryContactEmail: client.primaryContactEmail || "No email recorded",
    primaryContactPhone: client.primaryContactPhone || "No phone recorded",
    address: formatAddress(client),
    timeZone: client.timeZone || "Europe/London",
    campaignApprovalMode: client.campaignApprovalMode ?? "auto_approve",
    onboardingCompleted: Boolean(client.onboardingCompleted),
    createdAt: client.createdAt ?? null,
    updatedAt: client.updatedAt ?? null,
    activeContract: displayContract
      ? {
          documentId: displayContract.documentId ?? "",
          status: displayContract.status ?? "unknown",
          startDate: displayContract.startDate ?? null,
          endDate: displayContract.endDate ?? null,
          seatCount: displayContract.seatCount ?? 0,
          notes: displayContract.notes ?? "",
          paymentStatus: displayContract.paymentStatus ?? (pendingContract ? "pending" : "not_required"),
        }
      : null,
    users: (client.users ?? []).map(normalizeUser),
    campaigns: (client.campaigns ?? []).map((campaign) => ({
      id: campaign.documentId ?? `${campaign.title ?? campaign.name ?? "campaign"}-${campaign.createdAt ?? ""}`,
      title: campaign.title || campaign.name || "Untitled campaign",
      status: campaign.status || "unknown",
      approvalStatus: campaign.approvalStatus || "unknown",
      createdAt: campaign.createdAt ?? null,
    })),
    accessCodes: (client.access_codes ?? []).map((code) => ({
      id: code.documentId ?? `${code.targetRole ?? "code"}-${code.createdAt ?? ""}`,
      status: code.status || "unknown",
      targetRole: code.targetRole || "unknown",
      expiresAt: code.expiresAt ?? null,
      createdAt: code.createdAt ?? null,
    })),
    features: client.features ?? null,
  };
}

function normalizeClientEntitlement(client: RawClient): AdminClientEntitlementRow {
  const row = normalizeClient(client);
  const activeContract = getActiveContract(client);
  const pendingContract = getPendingContract(client);
  const displayContract = activeContract ?? pendingContract;

  return {
    ...row,
    activeContract: displayContract
      ? {
          documentId: displayContract.documentId ?? "",
          status: displayContract.status ?? "unknown",
          startDate: displayContract.startDate ?? null,
          endDate: displayContract.endDate ?? null,
          seatCount: displayContract.seatCount ?? 0,
          notes: displayContract.notes ?? "",
          paymentStatus: displayContract.paymentStatus ?? (pendingContract ? "pending" : "not_required"),
        }
      : null,
    features: client.features ?? null,
  };
}

async function getRawClients(authToken?: string | null) {
  const response = await adminStrapiRequest<StrapiListResponse<RawClient>>(
    "/admin/clients",
    undefined,
    authToken
  );

  return response.data ?? [];
}

function clientMatchesUser(client: RawClient, user: RawUser) {
  if (!user.client) return false;
  return Boolean(
    (client.documentId && user.client.documentId === client.documentId) ||
      (client.name && user.client.name === client.name)
  );
}

async function getRawClientsWithUsers(authToken?: string | null) {
  const clients = await getRawClients(authToken);
  let users: RawUser[] = [];

  try {
    users = await getRawUsers(authToken);
  } catch {
    users = [];
  }

  return clients.map((client) => {
    const directUsers = client.users ?? [];
    const directUserIds = new Set(
      directUsers.map((user) => user.documentId ?? user.email ?? user.id)
    );
    const relatedUsers = users.filter((user) => clientMatchesUser(client, user));
    const missingRelatedUsers = relatedUsers.filter(
      (user) => !directUserIds.has(user.documentId ?? user.email ?? user.id)
    );

    return {
      ...client,
      users: [...directUsers, ...missingRelatedUsers],
    };
  });
}

function formatRole(role?: RawRole): AdminUserRow["role"] {
  const value = roleValue(role);
  if (value === "administrator" || value === "admin" || value === "ctrl_admin") {
    return "CTRL Admin";
  }
  if (value === "client" || value === "client_contact") return "Client Contact";
  if (value === "hiring_manager") return "Hiring Manager";
  return "Candidate";
}

function normalizeUser(user: RawUser): AdminUserRow {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const role = formatRole(user.role);

  return {
    id: user.documentId ?? String(user.id ?? user.email ?? user.username ?? "user"),
    name: name || user.username || user.email || "Unnamed user",
    email: user.email || "No email recorded",
    role,
    client: user.client?.name || (role === "CTRL Admin" ? "CTRL Internal" : "Unassigned"),
    status: user.blocked ? "Disabled" : user.confirmed === false ? "Invited" : "Active",
    lastLogin: relativeDate(user.updatedAt ?? user.createdAt),
  };
}

async function getRawUsers(authToken?: string | null) {
  const response = await adminStrapiRequest<StrapiListResponse<RawUser>>(
    "/admin/users",
    undefined,
    authToken
  );

  return response.data ?? [];
}

function formatTimestamp(value?: string) {
  if (!value) return "Unknown";
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

function humanize(value?: string) {
  if (!value) return "Unknown";
  return value
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatAuditDetails(log: RawAuditLog): string {
  if (log.metadataResolved && Object.keys(log.metadataResolved).length > 0) {
    return Object.entries(log.metadataResolved)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" · ");
  }

  const metadata = log.metadata ?? {};
  const parts: string[] = [];

  if (log.resourceDisplayName) {
    parts.push(`${humanize(log.resource)}: ${log.resourceDisplayName}`);
  } else if (log.resource) {
    parts.push(humanize(log.resource));
  }

  const skipKeys = new Set(["clientDocumentId", "clientId", "clientName"]);
  for (const [key, value] of Object.entries(metadata)) {
    if (skipKeys.has(key)) continue;
    if (value === null || value === undefined || value === "") continue;
    if (typeof value === "object") {
      parts.push(`${humanize(key)}: ${JSON.stringify(value)}`);
    } else {
      parts.push(`${humanize(key)}: ${String(value)}`);
    }
  }

  return parts.join(" · ") || "No additional details recorded";
}

function formatAuditClient(log: RawAuditLog): string {
  if (log.clientDisplayName) return log.clientDisplayName;

  const metadata = log.metadata ?? {};
  const clientName = metadata.clientName ? String(metadata.clientName) : "";
  if (clientName) return clientName;

  return "Platform-wide";
}

function formatAuditActor(log: RawAuditLog): string {
  if (log.actorDisplayName) return log.actorDisplayName;
  return humanize(log.actorRole) || "System";
}

function normalizeAuditLog(log: RawAuditLog): AdminAuditLogRow {
  return {
    id: log.documentId ?? String(log.id ?? `${log.actionType}-${log.occurredAt}`),
    actor: formatAuditActor(log),
    actorRole: humanize(log.actorRole),
    timestamp: formatTimestamp(log.occurredAt ?? log.createdAt),
    rawTimestamp: log.occurredAt ?? log.createdAt ?? "",
    event: humanize(log.actionType),
    eventKey: log.actionType ?? "unknown",
    client: formatAuditClient(log),
    resource: humanize(log.resource),
    resourceLabel: log.resourceDisplayName ?? "",
    details: formatAuditDetails(log),
  };
}

export async function getAdminAuditLogs(
  authToken?: string | null
): Promise<AdminAuditLogRow[]> {
  const response = await adminStrapiRequest<StrapiListResponse<RawAuditLog>>(
    "/admin/audit-logs",
    undefined,
    authToken
  );

  return (response.data ?? []).map(normalizeAuditLog);
}

export async function getAdminClients(authToken?: string | null): Promise<AdminClientRow[]> {
  const clients = await getRawClientsWithUsers(authToken);
  return clients.map(normalizeClient);
}

export async function getAdminClientEntitlements(authToken?: string | null): Promise<AdminClientEntitlementRow[]> {
  const clients = await getRawClientsWithUsers(authToken);
  return clients.map(normalizeClientEntitlement);
}

export async function getAdminClientDetails(
  clientDocumentId: string,
  authToken?: string | null
): Promise<AdminClientDetails> {
  const clients = await getRawClientsWithUsers(authToken);
  const client = clients.find((item) => item.documentId === clientDocumentId);
  if (!client) {
    throw new AdminStrapiRequestError("Client not found", 404);
  }
  return normalizeClientDetails(client);
}

export async function generateAdminClientAccessCode(
  clientDocumentId: string,
  authToken?: string | null
): Promise<AdminClientAccessCodeResult> {
  const response = await adminStrapiRequest<{ data?: AdminClientAccessCodeResult }>(
    "/access-codes/generate-client",
    {
      method: "POST",
      body: JSON.stringify({ clientDocumentId }),
    },
    authToken
  );

  if (!response.data?.code) {
    throw new AdminStrapiRequestError("Client access code could not be generated", 500);
  }
  return response.data;
}

export async function sendAdminClientInvite(
  clientDocumentId: string,
  input: { email: string; accessCodeDocumentId?: string },
  authToken?: string | null
): Promise<AdminClientAccessCodeResult> {
  const response = await adminStrapiRequest<{ data?: AdminClientAccessCodeResult }>(
    `/admin/clients/${encodeURIComponent(clientDocumentId)}/send-client-invite`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    authToken
  );

  if (!response.data?.documentId) {
    throw new AdminStrapiRequestError("Client invite could not be sent", 500);
  }
  return response.data;
}

export async function deleteAdminClient(
  clientDocumentId: string,
  confirmName: string,
  authToken?: string | null
): Promise<void> {
  const trimmedName = confirmName.trim();
  const query = new URLSearchParams({ confirmName: trimmedName }).toString();
  await adminStrapiRequest(
    `/admin/clients/${encodeURIComponent(clientDocumentId)}?${query}`,
    { method: "DELETE" },
    authToken
  );
}

export async function createAdminClient(
  input: AdminClientCreateInput,
  authToken?: string | null
): Promise<AdminClientCreateResult> {
  const response = await adminStrapiRequest<{
    data?: {
      client?: RawClient;
      contract?: RawContract;
      accessCode?: AdminClientCreateResult["accessCode"];
    };
  }>(
    "/admin/clients",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    authToken
  );

  const createdClient = response.data?.client;

  return {
    client: normalizeClient({
      ...createdClient,
      contracts: response.data?.contract ? [response.data.contract] : createdClient?.contracts ?? [],
      users: createdClient?.users ?? [],
      campaigns: createdClient?.campaigns ?? [],
      access_codes: response.data?.accessCode
        ? [{
            status: response.data.accessCode.status,
            targetRole: response.data.accessCode.targetRole,
            expiresAt: response.data.accessCode.expiresAt,
          }]
        : createdClient?.access_codes ?? [],
    }),
    contract: response.data?.contract,
    accessCode: response.data?.accessCode,
  };
}

export async function getAdminOverview(authToken?: string | null): Promise<AdminOverview> {
  const rawClients = await getRawClientsWithUsers(authToken);
  const clients = rawClients.map(normalizeClient);
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  const contractsExpiringSoon = rawClients.filter((client) => {
    const contract = getActiveContract(client);
    if (!contract?.endDate) return false;
    const end = new Date(contract.endDate).getTime();
    return Number.isFinite(end) && end >= now && end <= now + thirtyDays;
  }).length;

  const availableClientCodes = rawClients.reduce(
    (total, client) =>
      total +
      (client.access_codes ?? []).filter(
        (code) => code.targetRole === "client" && code.status === "available"
      ).length,
    0
  );

  const pendingCampaignApprovals = clients.reduce(
    (total, client) => total + client.pendingCampaignApprovals,
    0
  );

  const maxedClient = clients.find(
    (client) => client.seatsAllowed > 0 && client.seatsUsed >= client.seatsAllowed
  );

  return {
    activeClients: rawClients.filter((client) => isActiveContract(getActiveContract(client) ?? undefined)).length,
    awaitingClientSignups: clients.filter((client) => client.status === "Awaiting signup").length,
    pendingCampaignApprovals,
    availableClientCodes,
    contractsExpiringSoon,
    seatUsage: [...clients]
      .sort((a, b) => b.seatsUsed / Math.max(1, b.seatsAllowed) - a.seatsUsed / Math.max(1, a.seatsAllowed))
      .slice(0, 5),
    recentActivity: clients.slice(0, 3).map((client) => ({
      id: `client-activity-${client.id}`,
      title: `${client.name} updated`,
      detail: `${client.lastActivity} • ${client.seatsUsed}/${client.seatsAllowed} seats`,
    })),
    attentionRequired: [
      ...(pendingCampaignApprovals
        ? [{
            id: "campaign-approvals",
            title: `${pendingCampaignApprovals} campaign approval${pendingCampaignApprovals === 1 ? "" : "s"} pending`,
            detail: "Clients need to review hiring-manager campaign requests.",
          }]
        : []),
      ...(maxedClient
        ? [{
            id: `maxed-seats-${maxedClient.id}`,
            title: `${maxedClient.name} has used all seats`,
            detail: `${maxedClient.seatsUsed}/${maxedClient.seatsAllowed} hiring-manager seats are occupied.`,
          }]
        : []),
    ],
  };
}

export async function getAdminUsers(
  authToken?: string | null
): Promise<AdminUsersSummary> {
  const rawUsers = await getRawUsers(authToken);
  const users = rawUsers.map(normalizeUser);

  return {
    users,
    totals: {
      all: users.length,
      ctrlAdmins: users.filter((user) => user.role === "CTRL Admin").length,
      clientContacts: users.filter((user) => user.role === "Client Contact").length,
      hiringManagers: users.filter((user) => user.role === "Hiring Manager").length,
      candidates: users.filter((user) => user.role === "Candidate").length,
      active: users.filter((user) => user.status === "Active").length,
      invited: users.filter((user) => user.status === "Invited").length,
      disabled: users.filter((user) => user.status === "Disabled").length,
    },
  };
}

export async function updateAdminClient(
  clientDocumentId: string,
  data: {
    features?: Record<string, any> | null;
    contract?: {
      seatCount?: number;
      notes?: string | null;
    };
  },
  authToken?: string | null
): Promise<any> {
  const response = await adminStrapiRequest<{ data?: RawClient }>(
    `/admin/clients/${encodeURIComponent(clientDocumentId)}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
    authToken
  );
  return response.data;
}

export async function getAdminAssessmentVersions(
  assessmentSlugs: string[],
  authToken?: string | null
): Promise<Record<string, AdminAssessmentVersionOption[]>> {
  const entries = await Promise.all(
    assessmentSlugs.map(async (slug) => {
      try {
        const response = await adminStrapiRequest<AssessmentVersionsResponse>(
          `/assessment/${encodeURIComponent(slug)}/versions`,
          undefined,
          authToken
        );

        return [
          slug,
          (response.data ?? [])
            .filter((version) => typeof version.version === "string" && version.version)
            .map((version) => ({
              version: version.version as string,
              title: version.title || `v${version.version}`,
              description: version.description ?? null,
            })),
        ] as const;
      } catch {
        return [slug, []] as const;
      }
    })
  );

  return Object.fromEntries(entries);
}
