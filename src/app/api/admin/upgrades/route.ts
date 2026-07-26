import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import {
  toAdminClientEntitlementRow,
  toAdminClientDetails,
  type FirebaseClientTeamWorkspace,
  type FirebaseOrganization,
} from "@/lib/firebase-admin-tenancy-bff";
import { invalidateClientEntitlementCachesByClientId } from "@/lib/portal-cache-keys";
import {
  getAdminClientEntitlements,
  getCmsErrorStatus,
  updateAdminClient,
} from "@/services/admin-platform.service";

const CONTRACT_STATUSES = ["active", "soft_locked", "pending_deletion"] as const;
type ContractStatus = (typeof CONTRACT_STATUSES)[number];

function isContractStatus(value: unknown): value is ContractStatus {
  return CONTRACT_STATUSES.includes(value as ContractStatus);
}

export async function GET() {
  const auth = await requireAdminDualAccess("entitlements.write");
  if ("error" in auth) return auth.error;

  try {
    if (isFirebaseAdminAuth(auth)) {
      const organizations = await auth.domainApi.request<FirebaseOrganization[]>({
        path: "/v1/organizations",
        firebaseSessionCookie: auth.firebaseSessionCookie,
      });
      const workspaces = await Promise.all(
        organizations.map((organization) =>
          auth.domainApi.request<FirebaseClientTeamWorkspace>({
            path: `/v1/organizations/${encodeURIComponent(organization.id)}/workspace`,
            firebaseSessionCookie: auth.firebaseSessionCookie,
          }),
        ),
      );
      return NextResponse.json({
        data: workspaces.map((workspace) => toAdminClientEntitlementRow(workspace)),
      });
    }

    const clients = await getAdminClientEntitlements(auth.cmsJwt);
    return NextResponse.json({ data: clients });
  } catch (error) {
    const upstreamStatus = getCmsErrorStatus(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Entitlements could not be loaded",
      },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminDualAccess("entitlements.write");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const clientDocumentId =
      typeof body?.clientDocumentId === "string" ? body.clientDocumentId : "";

    if (!clientDocumentId) {
      return NextResponse.json(
        { error: "clientDocumentId is required" },
        { status: 400 },
      );
    }

    const seatCount =
      body?.contract && "seatCount" in body.contract
        ? Number(body.contract.seatCount)
        : undefined;

    if (seatCount !== undefined && (!Number.isInteger(seatCount) || seatCount < 1)) {
      return NextResponse.json(
        { error: "seatCount must be at least 1" },
        { status: 400 },
      );
    }

    const status =
      body?.contract && "status" in body.contract
        ? body.contract.status
        : undefined;

    if (status !== undefined && !isContractStatus(status)) {
      return NextResponse.json(
        {
          error:
            "contract status must be active, soft_locked, or pending_deletion",
        },
        { status: 400 },
      );
    }

    if (isFirebaseAdminAuth(auth)) {
      if (seatCount !== undefined) {
        await auth.domainApi.request({
          path: `/v1/organizations/${encodeURIComponent(clientDocumentId)}/entitlements/hiring-manager-seats`,
          method: "PUT",
          firebaseSessionCookie: auth.firebaseSessionCookie,
          body: { quantity: seatCount },
        });
      }
      if (body?.features && typeof body.features === "object") {
        await auth.domainApi.request({
          path: `/v1/organizations/${encodeURIComponent(clientDocumentId)}/entitlements/features`,
          method: "PUT",
          firebaseSessionCookie: auth.firebaseSessionCookie,
          body: { features: body.features },
        });
      }
      if (status === "soft_locked") {
        await auth.domainApi.request({
          path: `/v1/organizations/${encodeURIComponent(clientDocumentId)}/lifecycle`,
          method: "POST",
          firebaseSessionCookie: auth.firebaseSessionCookie,
          body: { status: "suspended" },
        });
      } else if (status === "active") {
        await auth.domainApi.request({
          path: `/v1/organizations/${encodeURIComponent(clientDocumentId)}/lifecycle`,
          method: "POST",
          firebaseSessionCookie: auth.firebaseSessionCookie,
          body: { status: "active" },
        });
      } else if (status === "pending_deletion") {
        await auth.domainApi.request({
          path: `/v1/organizations/${encodeURIComponent(clientDocumentId)}/lifecycle`,
          method: "POST",
          firebaseSessionCookie: auth.firebaseSessionCookie,
          body: { status: "closed" },
        });
      }

      const workspace = await auth.domainApi.request<FirebaseClientTeamWorkspace>({
        path: `/v1/organizations/${encodeURIComponent(clientDocumentId)}/workspace`,
        firebaseSessionCookie: auth.firebaseSessionCookie,
      });
      void invalidateClientEntitlementCachesByClientId(clientDocumentId);
      return NextResponse.json({ data: toAdminClientDetails(workspace) });
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
      auth.cmsJwt,
    );

    void invalidateClientEntitlementCachesByClientId(clientDocumentId);
    return NextResponse.json({ data: updated });
  } catch (error) {
    const upstreamStatus = getCmsErrorStatus(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Entitlements could not be updated",
      },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 },
    );
  }
}
