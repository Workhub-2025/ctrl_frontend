import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import {
  getAdminClientEntitlements,
  getStrapiErrorStatus,
  updateAdminClient,
} from "@/services/admin-platform.service";

const CONTRACT_STATUSES = ["active", "soft_locked", "pending_deletion"] as const;
type ContractStatus = (typeof CONTRACT_STATUSES)[number];

function isContractStatus(value: unknown): value is ContractStatus {
  return CONTRACT_STATUSES.includes(value as ContractStatus);
}

export async function GET() {
  const auth = await requireAdminApiAccess('entitlements.write');
  if ("error" in auth) return auth.error;

  try {
    const clients = await getAdminClientEntitlements(auth.strapiJwt);
    return NextResponse.json({ data: clients });
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Entitlements could not be loaded" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApiAccess('entitlements.write');
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const clientDocumentId =
      typeof body?.clientDocumentId === "string" ? body.clientDocumentId : "";

    if (!clientDocumentId) {
      return NextResponse.json({ error: "clientDocumentId is required" }, { status: 400 });
    }

    const seatCount =
      body?.contract && "seatCount" in body.contract
        ? Number(body.contract.seatCount)
        : undefined;

    if (seatCount !== undefined && (!Number.isInteger(seatCount) || seatCount < 1)) {
      return NextResponse.json({ error: "seatCount must be at least 1" }, { status: 400 });
    }

    const status =
      body?.contract && "status" in body.contract
        ? body.contract.status
        : undefined;

    if (status !== undefined && !isContractStatus(status)) {
      return NextResponse.json(
        { error: "contract status must be active, soft_locked, or pending_deletion" },
        { status: 400 }
      );
    }

    const updated = await updateAdminClient(
      clientDocumentId,
      {
        features:
          body?.features && typeof body.features === "object"
            ? body.features
            : undefined,
        contract:
          seatCount !== undefined || status !== undefined
            ? {
                seatCount,
                notes:
                  typeof body?.contract?.notes === "string"
                    ? body.contract.notes
                    : undefined,
                status,
              }
            : undefined,
      },
      auth.strapiJwt
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Entitlements could not be updated" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}
