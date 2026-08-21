import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import {
  preferredContract,
  toAdminClientDetails,
  type FirebaseClientTeamWorkspace,
} from "@/lib/firebase-admin-tenancy-bff";
import { createFirebaseBillingApi } from "@/lib/firebase-billing-api";
import { invalidateClientEntitlementCachesByClientId } from "@/lib/portal-cache-keys";

type RouteContext = {
  params: Promise<{ clientId: string }>;
};

async function getClientId(context: RouteContext) {
  const params = await context.params;
  return params.clientId;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireAdminDualAccess("clients.read");
  if ("error" in auth) return auth.error;

  try {
    const clientId = await getClientId(context);
    const billing = createFirebaseBillingApi(
      auth.domainApi,
      auth.firebaseSessionCookie,
    );
    const [workspace, contracts] = await Promise.all([
      auth.domainApi.request<FirebaseClientTeamWorkspace>({
        path: `/v1/organizations/${encodeURIComponent(clientId)}/workspace`,
        firebaseSessionCookie: auth.firebaseSessionCookie,
      }),
      billing.listOrganizationContracts(clientId).catch(() => []),
    ]);
    return NextResponse.json({
      data: toAdminClientDetails(workspace, preferredContract(contracts)),
    });
  } catch (error) {
    const status =
      error && typeof error === "object" && "status" in error
        ? Number((error as { status?: unknown }).status)
        : NaN;
    if (status === 404) {
      return NextResponse.json({ data: null });
    }
    return handleBffRouteError(error, "Client could not be loaded");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminDualAccess("clients.write");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const confirmName =
      typeof body?.confirmName === "string" ? body.confirmName.trim() : "";
    if (!confirmName) {
      return NextResponse.json(
        { error: "confirmName is required" },
        { status: 400 },
      );
    }

    const clientId = await getClientId(context);
    const workspace = await auth.domainApi.request<FirebaseClientTeamWorkspace>({
      path: `/v1/organizations/${encodeURIComponent(clientId)}/workspace`,
      firebaseSessionCookie: auth.firebaseSessionCookie,
    });
    if (
      workspace.organization.legalName.trim().toLowerCase() !==
      confirmName.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Organisation name confirmation did not match" },
        { status: 400 },
      );
    }
    await auth.domainApi.request({
      path: `/v1/organizations/${encodeURIComponent(clientId)}/lifecycle`,
      method: "POST",
      firebaseSessionCookie: auth.firebaseSessionCookie,
      body: { status: "closed" },
    });
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    return handleBffRouteError(error, "Client could not be deleted");
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminDualAccess("entitlements.write");
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be an object" },
        { status: 400 },
      );
    }

    const clientId = await getClientId(context);
    const patch: {
      legalName?: string;
      campaignApprovalMode?: "auto_approve" | "require_approval";
    } = {};
    if (typeof body.legalName === "string" && body.legalName.trim()) {
      patch.legalName = body.legalName.trim();
    } else if (typeof body.name === "string" && body.name.trim()) {
      patch.legalName = body.name.trim();
    }
    if (
      body.campaignApprovalMode === "auto_approve" ||
      body.campaignApprovalMode === "require_approval"
    ) {
      patch.campaignApprovalMode = body.campaignApprovalMode;
    }
    if (Object.keys(patch).length > 0) {
      await auth.domainApi.request({
        path: `/v1/organizations/${encodeURIComponent(clientId)}`,
        method: "PATCH",
        firebaseSessionCookie: auth.firebaseSessionCookie,
        body: patch,
      });
    }

    const seatCount =
      body.contract && "seatCount" in body.contract
        ? Number(body.contract.seatCount)
        : undefined;
    if (seatCount !== undefined) {
      if (!Number.isInteger(seatCount) || seatCount < 1) {
        return NextResponse.json(
          { error: "seatCount must be at least 1" },
          { status: 400 },
        );
      }
      await auth.domainApi.request({
        path: `/v1/organizations/${encodeURIComponent(clientId)}/entitlements/hiring-manager-seats`,
        method: "PUT",
        firebaseSessionCookie: auth.firebaseSessionCookie,
        body: { quantity: seatCount },
      });
    }

    if (body.features && typeof body.features === "object") {
      await auth.domainApi.request({
        path: `/v1/organizations/${encodeURIComponent(clientId)}/entitlements/features`,
        method: "PUT",
        firebaseSessionCookie: auth.firebaseSessionCookie,
        body: { features: body.features },
      });
    }

    if (
      body.contract &&
      typeof body.contract === "object" &&
      "status" in body.contract
    ) {
      const status = body.contract.status;
      if (status === "soft_locked") {
        await auth.domainApi.request({
          path: `/v1/organizations/${encodeURIComponent(clientId)}/lifecycle`,
          method: "POST",
          firebaseSessionCookie: auth.firebaseSessionCookie,
          body: { status: "suspended" },
        });
      } else if (status === "active") {
        await auth.domainApi.request({
          path: `/v1/organizations/${encodeURIComponent(clientId)}/lifecycle`,
          method: "POST",
          firebaseSessionCookie: auth.firebaseSessionCookie,
          body: { status: "active" },
        });
      } else if (status === "pending_deletion") {
        await auth.domainApi.request({
          path: `/v1/organizations/${encodeURIComponent(clientId)}/lifecycle`,
          method: "POST",
          firebaseSessionCookie: auth.firebaseSessionCookie,
          body: { status: "closed" },
        });
      }
    }

    const workspace = await auth.domainApi.request<FirebaseClientTeamWorkspace>({
      path: `/v1/organizations/${encodeURIComponent(clientId)}/workspace`,
      firebaseSessionCookie: auth.firebaseSessionCookie,
    });
    const billing = createFirebaseBillingApi(
      auth.domainApi,
      auth.firebaseSessionCookie,
    );
    const contracts = await billing
      .listOrganizationContracts(clientId)
      .catch(() => []);
    void invalidateClientEntitlementCachesByClientId(clientId);
    return NextResponse.json({
      data: toAdminClientDetails(workspace, preferredContract(contracts)),
    });
  } catch (error) {
    return handleBffRouteError(error, "Client could not be updated");
  }
}
