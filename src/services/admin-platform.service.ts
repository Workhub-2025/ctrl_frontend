import "server-only";

import { strapiRequest } from "@/services/hiring-manager-campaigns.service";
import { getStrapiErrorStatus as getBaseStrapiErrorStatus } from "@/services/hiring-manager-campaigns.service";

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, "");
const stripLeadingSlashes = (value: string) => value.replace(/^\/+/, "");

function getStrapiBaseUrl() {
  return stripTrailingSlashes(
    process.env.STRAPI_API_URL ??
      process.env.NEXT_PUBLIC_STRAPI_API_URL ??
      "http://localhost:1337/api"
  );
}

function getAdminApiToken() {
  return (
    process.env.STRAPI_API_FULL_ACCESS_TOKEN ||
    process.env.STRAPI_API_FULL_ACCCESS_TOKEN ||
    process.env.STRAPI_API_TOKEN ||
    undefined
  );
}

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
  return getBaseStrapiErrorStatus(error);
}

async function adminStrapiRequest<T>(
  path: string,
  init?: RequestInit,
  authToken?: string | null
): Promise<T> {
  const token = authToken || getAdminApiToken() || undefined;
  if (!token) {
    throw new Error(
      "A Strapi API token or authenticated admin session is required for admin client creation"
    );
  }

  const response = await fetch(
    `${getStrapiBaseUrl()}/${stripLeadingSlashes(path)}`,
    {
      cache: "no-store",
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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

type StrapiSingleResponse<T> = {
  data?: T;
};

type RawRole = {
  type?: string;
  name?: string;
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
  startDate?: string;
  endDate?: string;
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
  }>;
  updatedAt?: string;
};

export type AdminClientRow = {
  id: string;
  name: string;
  status: "Active" | "Paused" | "Expired" | "Pending";
  plan: string;
  seatsUsed: number;
  seatsAllowed: number;
  enabledAssessments: string[];
  billingStatus: "Active" | "Pending" | "Expired" | "Paused";
  primaryContact: string;
  lastActivity: string;
  pendingCampaignApprovals: number;
};

export type AdminOverview = {
  activeClients: number;
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
    hiringManagers: number;
    candidates: number;
    disabled: number;
  };
};

export type AdminAuditLogRow = {
  id: string;
  actor: string;
  timestamp: string;
  event: string;
  client: string;
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
    startDate: string;
    endDate: string;
    seatCount: number;
    notes?: string;
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
};

export type AdminClientAccessCodeResult = {
  documentId: string;
  code: string;
  expiresAt: string;
  status: string;
  targetRole: string;
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
};

function isActiveContract(contract?: RawContract) {
  if (!contract || contract.status !== "active") return false;
  if (!contract.endDate) return true;
  return new Date(contract.endDate).getTime() >= Date.now();
}

function getActiveContract(client: RawClient) {
  return (client.contracts ?? []).find(isActiveContract) ?? client.contracts?.[0] ?? null;
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
  const seatsAllowed = activeContract?.seatCount ?? 0;
  const seatsUsed = (client.users ?? []).filter(
    (user) => !user.blocked && user.role?.type === "hiring_manager"
  ).length;
  const pendingCampaignApprovals = (client.campaigns ?? []).filter(
    (campaign) => campaign.approvalStatus === "pending"
  ).length;
  const status = client.softLockedAt
    ? "Paused"
    : isActiveContract(activeContract ?? undefined)
      ? "Active"
      : activeContract
        ? "Expired"
        : "Pending";

  return {
    id: client.documentId ?? String(client.id ?? `client-${client.name ?? "unknown"}`),
    name: client.name ?? "Unnamed client",
    status,
    plan: seatsAllowed >= 10 ? "Enterprise" : seatsAllowed >= 3 ? "Professional" : "Standard",
    seatsUsed,
    seatsAllowed,
    enabledAssessments: ["Typing", "SJT", "Prioritisation", "Call Simulation"],
    billingStatus:
      status === "Active" ? "Active" : status === "Paused" ? "Paused" : status === "Expired" ? "Expired" : "Pending",
    primaryContact:
      client.primaryContactEmail ||
      client.primaryContactName ||
      "No primary contact",
    lastActivity: relativeDate(client.updatedAt),
    pendingCampaignApprovals,
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
    activeContract: activeContract
      ? {
          documentId: activeContract.documentId ?? "",
          status: activeContract.status ?? "unknown",
          startDate: activeContract.startDate ?? null,
          endDate: activeContract.endDate ?? null,
          seatCount: activeContract.seatCount ?? 0,
          notes: activeContract.notes ?? "",
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
  };
}

async function getRawClients() {
  const response = await strapiRequest<StrapiListResponse<RawClient>>(
    "/clients?populate[contracts]=true&populate[users][populate][role]=true&populate[campaigns]=true&populate[access_codes]=true&sort=updatedAt:desc&pagination[pageSize]=100"
  );

  return response.data ?? [];
}

function formatRole(role?: RawRole): AdminUserRow["role"] {
  const value = (role?.type || role?.name || "").toLowerCase().replace(/[-\s]+/g, "_");
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

async function getRawUsers() {
  const response = await strapiRequest<StrapiListResponse<RawUser>>(
    "/users?populate[role]=true&populate[client]=true&sort=updatedAt:desc&pagination[pageSize]=250"
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

function normalizeAuditLog(log: RawAuditLog): AdminAuditLogRow {
  const metadata = log.metadata ?? {};
  const clientDocumentId = String(
    metadata.clientDocumentId ??
    metadata.clientId ??
    ""
  );

  return {
    id: log.documentId ?? String(log.id ?? `${log.actionType}-${log.occurredAt}`),
    actor: log.actorRole
      ? `${humanize(log.actorRole)} ${log.actorUserId ? `(${log.actorUserId})` : ""}`.trim()
      : log.actorUserId || "System",
    timestamp: formatTimestamp(log.occurredAt ?? log.createdAt),
    event: humanize(log.actionType),
    client: clientDocumentId || String(metadata.clientName ?? "N/A"),
    details:
      log.resource
        ? `${humanize(log.resource)}${log.resourceId ? ` • ${log.resourceId}` : ""}`
        : JSON.stringify(metadata),
  };
}

export async function getAdminAuditLogs(): Promise<AdminAuditLogRow[]> {
  const response = await strapiRequest<StrapiListResponse<RawAuditLog>>(
    "/audit-logs?sort=occurredAt:desc&pagination[pageSize]=100"
  );

  return (response.data ?? []).map(normalizeAuditLog);
}

export async function getAdminClients(): Promise<AdminClientRow[]> {
  const clients = await getRawClients();
  return clients.map(normalizeClient);
}

export async function getAdminClientDetails(clientDocumentId: string): Promise<AdminClientDetails> {
  const response = await strapiRequest<StrapiListResponse<RawClient>>(
    `/clients?filters[documentId][$eq]=${encodeURIComponent(clientDocumentId)}&populate[contracts]=true&populate[users][populate][role]=true&populate[campaigns]=true&populate[access_codes]=true&pagination[pageSize]=1`
  );
  const client = response.data?.[0];
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

export async function deleteAdminClient(
  clientDocumentId: string,
  confirmName: string,
  authToken?: string | null
): Promise<void> {
  await adminStrapiRequest(
    `/admin/clients/${encodeURIComponent(clientDocumentId)}`,
    {
      method: "DELETE",
      body: JSON.stringify({ confirmName }),
    },
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
        ? [{ status: response.data.accessCode.status, targetRole: response.data.accessCode.targetRole }]
        : createdClient?.access_codes ?? [],
    }),
    contract: response.data?.contract,
    accessCode: response.data?.accessCode,
  };
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const rawClients = await getRawClients();
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
    activeClients: clients.filter((client) => client.status === "Active").length,
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

export async function getAdminUsers(): Promise<AdminUsersSummary> {
  const rawUsers = await getRawUsers();
  const users = rawUsers.map(normalizeUser);

  return {
    users,
    totals: {
      all: users.length,
      hiringManagers: users.filter((user) => user.role === "Hiring Manager").length,
      candidates: users.filter((user) => user.role === "Candidate").length,
      disabled: users.filter((user) => user.status === "Disabled").length,
    },
  };
}
