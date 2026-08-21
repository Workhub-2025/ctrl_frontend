import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import type { ClientUpgradeRequestPayload } from "@/lib/client/entitlements";
import {
  createFirebaseBillingApi,
  requireFirebaseBillingSession,
} from "@/lib/firebase-billing-api";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

function mapFirebaseRequest(row: {
  documentId?: string;
  id?: string;
  requestNumber?: string;
  clientDocumentId?: string;
  clientName?: string;
  requestKind?: string;
  upgradeType?: string;
  subject?: string;
  payload?: unknown;
  billingStatus?: string;
  amountDuePence?: number | null;
  currency?: string;
  stripeCheckoutSessionId?: string | null;
  createdAt?: string | Date;
  checkoutUrl?: string | null;
}) {
  const payload = row.payload as ClientUpgradeRequestPayload | undefined;
  if (!payload?.type) {
    throw new Error("Billing request payload is invalid");
  }
  const id = String(row.documentId ?? row.id ?? "");
  return {
    id,
    requestNumber: String(row.requestNumber ?? id.slice(0, 8).toUpperCase()),
    ticketNumber: String(row.requestNumber ?? id.slice(0, 8).toUpperCase()),
    subject: String(row.subject ?? "Upgrade request"),
    status: String(row.billingStatus ?? "requested"),
    priority: "normal",
    createdAt:
      typeof row.createdAt === "string"
        ? row.createdAt
        : row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : new Date().toISOString(),
    requestKind: (row.requestKind ?? "client_upgrade") as
      | "client_upgrade"
      | "contract_renewal"
      | "contract_activation",
    upgradeType: (row.upgradeType ?? payload.type) as ClientUpgradeRequestPayload["type"],
    payload,
    billingStatus: row.billingStatus ?? "requested",
    amountDuePence: row.amountDuePence ?? null,
    currency: row.currency ?? "gbp",
    stripeCheckoutSessionId: row.stripeCheckoutSessionId ?? null,
    checkoutUrl: row.checkoutUrl ?? null,
    clientName: row.clientName,
  };
}

function sanitizeUpgradePayload(
  payload: ClientUpgradeRequestPayload,
): ClientUpgradeRequestPayload {
  if (payload.type !== "upgrade_bundle") return payload;
  const lineItems = Array.isArray(payload.lineItems)
    ? payload.lineItems.map((item) => ({
        label: String(item.label ?? "").trim(),
        quantity: Number(item.quantity),
        unitAmountPence: Number(item.unitAmountPence),
      }))
    : undefined;
  return {
    ...payload,
    lineItems:
      lineItems && lineItems.length > 0
        ? lineItems.filter(
            (item) =>
              item.label.length > 0 &&
              Number.isInteger(item.quantity) &&
              item.quantity > 0 &&
              Number.isInteger(item.unitAmountPence) &&
              item.unitAmountPence >= 0,
          )
        : undefined,
  };
}

export async function GET() {
  try {
    const firebaseAuth = await requireFirebaseBillingSession();
    const billing = createFirebaseBillingApi(
      firebaseAuth.domainApi,
      firebaseAuth.firebaseSessionCookie,
    );
    const rows = await billing.listClientBillingRequests();
    return NextResponse.json({
      data: rows
        .map((row) => {
          try {
            return mapFirebaseRequest(row);
          } catch {
            return null;
          }
        })
        .filter(Boolean),
    });
  } catch (error) {
    return handleBffRouteError(error, "Upgrade requests could not be loaded");
  }
}

export async function POST(request: Request) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const body = (await request.json().catch(() => ({}))) as {
      payload?: ClientUpgradeRequestPayload;
      priority?: "low" | "normal" | "high" | "urgent";
    };

    if (!body.payload?.type) {
      return NextResponse.json({ error: "payload is required" }, { status: 400 });
    }

    const firebaseAuth = await requireFirebaseBillingSession();
    const billing = createFirebaseBillingApi(
      firebaseAuth.domainApi,
      firebaseAuth.firebaseSessionCookie,
    );
    const created = await billing.createClientBillingRequest(
      sanitizeUpgradePayload(body.payload) as unknown as Record<string, unknown>,
    );
    return NextResponse.json(
      { data: mapFirebaseRequest(created) },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upgrade request could not be submitted";
    if (
      message.includes("must be") ||
      message.includes("Please provide") ||
      message.includes("payload")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return handleBffRouteError(error, "Upgrade request could not be submitted");
  }
}
