import "server-only";

import {
  type ClientUpgradeRequestPayload,
  type ClientUpgradeRequestRecord,
  type ClientUpgradeRequestType,
  type ClientBillingRequestKind,
  buildUpgradeRequestSubject,
} from "@/lib/client/entitlements";
import {
  requireClientSession,
  handleBffRouteError,
} from "@/lib/auth/bff-session";
import {
  PORTAL_USER_SCOPED_TTL_MS,
  portalClientEntitlementsCacheKey,
} from "@/lib/portal-cache-keys";
import { getServerAuthSub } from "@/lib/portal-server-auth";
import { portalServerCacheGetOrSet } from "@/lib/portal-server-cache";
import {
  invalidateClientEntitlementsServerCache,
  invalidateClientPortalServerCache,
} from "@/lib/portal-cache-invalidation";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

export { requireClientSession, handleBffRouteError };

export type BackendClientEntitlements = {
  client: {
    documentId?: string;
    name?: string;
    billingStatus?: string;
    autoRenew?: boolean;
  };
  contractActive: boolean;
  contract: {
    documentId?: string;
    seatCount?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
    paymentStatus?: string;
    paidAt?: string | null;
    daysUntilExpiry?: number | null;
    tier?: string;
    minimumContractedSeats?: number;
    founderDiscountPercent?: number | null;
    assessmentDataRetentionMonths?: number | null;
    effectiveAssessmentDataRetentionMonths?: number;
  } | null;
  dataRetention?: {
    platformDefaultMonths: number;
    effectiveMonths: number;
    contractConfiguredMonths: number | null;
  };
  platformFeatures: Record<string, boolean>;
  deliveryFeatures?: Record<string, boolean>;
  defaultAssessments: Array<{
    slug: string;
    title: string;
    maxVersion: string;
    includedByDefault: boolean;
    availableVersions?: Array<{ version: string; title: string; description: string | null }>;
  }>;
  additionalAssessments: Array<{
    slug: string;
    title: string;
    summary?: string | null;
    maxVersion: string;
    availableVersions?: Array<{ version: string; title: string; description: string | null }>;
  }>;
  requestableAssessments: Array<{
    slug: string;
    title: string;
    summary?: string | null;
  }>;
  canRequestUpgrades: boolean;
  lockState?: {
    operational: boolean;
    reason: string | null;
    userMessage: string;
  };
};

type BillingRequestRow = {
  documentId?: string;
  id?: string | number;
  requestNumber?: string;
  clientDocumentId?: string;
  clientName?: string;
  requestKind?: ClientBillingRequestKind;
  upgradeType?: ClientUpgradeRequestType;
  subject?: string;
  description?: string;
  payload?: ClientUpgradeRequestPayload;
  billingStatus?: string;
  amountDuePence?: number | null;
  currency?: string;
  stripeCheckoutSessionId?: string | null;
  createdAt?: string;
};

function mapBillingRequest(row: BillingRequestRow): ClientUpgradeRequestRecord {
  const payload = row.payload;
  if (!payload?.type) {
    throw new Error("Billing request payload is invalid");
  }

  return {
    id: String(row.documentId ?? row.id ?? ""),
    requestNumber: String(row.requestNumber ?? ""),
    ticketNumber: String(row.requestNumber ?? ""),
    subject: String(row.subject ?? buildUpgradeRequestSubject(payload)),
    status: String(row.billingStatus ?? "requested"),
    priority: "normal",
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    requestKind: row.requestKind ?? "client_upgrade",
    upgradeType: (row.upgradeType ?? payload.type) as ClientUpgradeRequestType,
    payload,
    billingStatus: row.billingStatus ?? "requested",
    amountDuePence: row.amountDuePence ?? null,
    currency: row.currency ?? "gbp",
    stripeCheckoutSessionId: row.stripeCheckoutSessionId ?? null,
    clientName: row.clientName,
  };
}


/** Backend-resolved entitlements — never compute unlock state in the browser. */
async function loadClientEntitlementsBundle(): Promise<BackendClientEntitlements> {
  const response = await strapiRequest<{ data?: BackendClientEntitlements }>("/client/entitlements");
  if (!response.data) {
    throw new Error("Entitlements could not be loaded");
  }
  return response.data;
}

export async function getClientEntitlementsBundle(): Promise<BackendClientEntitlements> {
  await requireClientSession();

  const userSub = await getServerAuthSub();
  if (!userSub) {
    return loadClientEntitlementsBundle();
  }

  return portalServerCacheGetOrSet(
    portalClientEntitlementsCacheKey(userSub),
    PORTAL_USER_SCOPED_TTL_MS,
    loadClientEntitlementsBundle,
  );
}

export async function listClientUpgradeRequests(): Promise<ClientUpgradeRequestRecord[]> {
  await requireClientSession();

  const response = await strapiRequest<{ data?: BillingRequestRow[] }>("/client/billing-requests");
  return (response.data ?? [])
    .map((row) => {
      try {
        return mapBillingRequest(row);
      } catch {
        return null;
      }
    })
    .filter(Boolean) as ClientUpgradeRequestRecord[];
}

export async function createClientUpgradeRequest(input: {
  payload: ClientUpgradeRequestPayload;
  priority?: "low" | "normal" | "high" | "urgent";
}) {
  await requireClientSession();

  const response = await strapiRequest<{ data?: BillingRequestRow }>("/client/upgrade-requests", {
    method: "POST",
    body: JSON.stringify({
      payload: input.payload,
    }),
  });

  const row = response.data;
  if (!row) throw new Error("Upgrade request could not be created");

  void invalidateClientEntitlementsServerCache();
  void invalidateClientPortalServerCache();

  return mapBillingRequest(row);
}
