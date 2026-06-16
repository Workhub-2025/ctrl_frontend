import "server-only";

import {
  parseBillingRequestFromTicket,
  type ClientUpgradeRequestPayload,
  type ClientUpgradeRequestRecord,
} from "@/lib/client/entitlements";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { normalizeRole } from "@/lib/auth/role-model";

export type BackendClientEntitlements = {
  client: {
    documentId?: string;
    name?: string;
    billingStatus?: string;
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
  } | null;
  platformFeatures: Record<string, boolean>;
  defaultAssessments: Array<{
    slug: string;
    title: string;
    maxVersion: string;
    includedByDefault: boolean;
  }>;
  additionalAssessments: Array<{
    slug: string;
    title: string;
    summary?: string | null;
    maxVersion: string;
  }>;
  requestableAssessments: Array<{
    slug: string;
    title: string;
    summary?: string | null;
  }>;
  versionUpgradeAssessments: Array<{
    slug: string;
    title: string;
    summary?: string | null;
    maxVersion: string;
  }>;
  canRequestUpgrades: boolean;
};

type SupportTicketResponse = {
  data?: {
    id: string;
    documentId?: string;
    ticketNumber: string;
    subject: string;
    status: string;
    priority: string;
    createdAt: string;
    billingStatus?: string;
    amountDuePence?: number | null;
    currency?: string;
    stripeCheckoutSessionId?: string | null;
    metadata?: Record<string, unknown> | null;
  };
};

type SupportTicketListResponse = {
  data?: Array<{
    id: string;
    documentId?: string;
    ticketNumber: string;
    subject: string;
    status: string;
    priority: string;
    createdAt: string;
    billingStatus?: string;
    amountDuePence?: number | null;
    currency?: string;
    stripeCheckoutSessionId?: string | null;
    metadata?: Record<string, unknown> | null;
  }>;
};

export async function requireClientSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.jwt) {
    throw new Error("Authentication required");
  }
  if (normalizeRole(session.user.role) !== "client") {
    throw new Error("Client access required");
  }
  return session;
}

/** Backend-resolved entitlements — never compute unlock state in the browser. */
export async function getClientEntitlementsBundle(): Promise<BackendClientEntitlements> {
  await requireClientSession();
  const response = await strapiRequest<{ data?: BackendClientEntitlements }>("/client/entitlements");
  if (!response.data) {
    throw new Error("Entitlements could not be loaded");
  }
  return response.data;
}

export async function listClientUpgradeRequests(): Promise<
  Array<
    ClientUpgradeRequestRecord & {
      billingStatus?: string;
      amountDuePence?: number | null;
      currency?: string;
      stripeCheckoutSessionId?: string | null;
    }
  >
> {
  await requireClientSession();

  const response = await strapiRequest<SupportTicketListResponse>("/client/billing-requests");
  return (response.data ?? [])
    .map((ticket) => {
      const record = parseBillingRequestFromTicket({
        id: ticket.documentId ?? ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        metadata: ticket.metadata,
      });
      if (!record) return null;
      return {
        ...record,
        billingStatus: ticket.billingStatus ?? "none",
        amountDuePence: ticket.amountDuePence ?? null,
        currency: ticket.currency ?? "gbp",
        stripeCheckoutSessionId: ticket.stripeCheckoutSessionId ?? null,
      };
    })
    .filter(Boolean) as Array<
    ClientUpgradeRequestRecord & {
      billingStatus?: string;
      amountDuePence?: number | null;
      currency?: string;
      stripeCheckoutSessionId?: string | null;
    }
  >;
}

export async function createClientUpgradeRequest(input: {
  payload: ClientUpgradeRequestPayload;
  priority?: "low" | "normal" | "high" | "urgent";
}) {
  await requireClientSession();
  const summary = await strapiRequest<{ data?: { client?: { documentId?: string; name?: string } } }>(
    "/client/dashboard"
  );
  const clientName = summary.data?.client?.name;
  const clientDocumentId = summary.data?.client?.documentId;

  if (!clientDocumentId) {
    throw new Error("Client account could not be resolved");
  }

  const { buildUpgradeRequestSubject, buildUpgradeRequestDescription } = await import(
    "@/lib/client/entitlements"
  );
  const subject = buildUpgradeRequestSubject(input.payload);
  const description = buildUpgradeRequestDescription(input.payload, clientName);

  const response = await strapiRequest<SupportTicketResponse>("/support-tickets", {
    method: "POST",
    body: JSON.stringify({
      subject,
      description,
      category: "feature_request",
      priority: input.priority ?? "normal",
      metadata: {
        requestKind: "client_upgrade",
        upgradeType: input.payload.type,
        clientDocumentId,
        clientName,
        payload: input.payload,
      },
    }),
  });

  const ticket = response.data;
  if (!ticket) throw new Error("Upgrade request could not be created");

  const record = parseBillingRequestFromTicket({
    id: ticket.documentId ?? ticket.id,
    ticketNumber: ticket.ticketNumber,
    subject: ticket.subject,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt,
    metadata: {
      requestKind: "client_upgrade",
      upgradeType: input.payload.type,
      payload: input.payload,
    },
  });

  if (!record) throw new Error("Upgrade request was created but could not be parsed");
  return record;
}
