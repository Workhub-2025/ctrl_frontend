import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import {
  toAdminClientDetails,
  type FirebaseClientTeamWorkspace,
} from "@/lib/firebase-admin-tenancy-bff";
import { invalidateClientEntitlementCachesByClientId } from "@/lib/portal-cache-keys";
import {
  deleteAdminClient,
  getAdminClientDetails,
  getCmsErrorStatus,
} from "@/services/admin-platform.service";

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
    if (isFirebaseAdminAuth(auth)) {
      const workspace = await auth.domainApi.request<FirebaseClientTeamWorkspace>({
        path: `/v1/organizations/${encodeURIComponent(clientId)}/workspace`,
        firebaseSessionCookie: auth.firebaseSessionCookie,
      });
      return NextResponse.json({ data: toAdminClientDetails(workspace) });
    }

    const client = await getAdminClientDetails(clientId, auth.cmsJwt);
    return NextResponse.json({ data: client });
  } catch (error) {
    const upstreamStatus = getCmsErrorStatus(error);
    if (upstreamStatus === 404) {
      return NextResponse.json({ data: null });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Client could not be loaded",
      },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 },
    );
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
    if (isFirebaseAdminAuth(auth)) {
      const workspace = await auth.domainApi.request<FirebaseClientTeamWorkspace>({
        path: `/v1/organizations/${encodeURIComponent(clientId)}/workspace`,
        firebaseSessionCookie: auth.firebaseSessionCookie,
      });
      if (
        workspace.organization.legalName.trim().toLowerCase() !==
        confirmName.toLowerCase()
      ) {
        return NextResponse.json(
          { error: "Organization name confirmation did not match" },
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
    }

    await deleteAdminClient(clientId, confirmName, auth.cmsJwt);
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    const upstreamStatus = getCmsErrorStatus(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Client could not be deleted",
      },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 },
    );
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
    if (isFirebaseAdminAuth(auth)) {
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
      void invalidateClientEntitlementCachesByClientId(clientId);
      return NextResponse.json({ data: toAdminClientDetails(workspace) });
    }

    const { updateAdminClient } = await import(
      "@/services/admin-platform.service"
    );
    const updated = await updateAdminClient(clientId, body, auth.cmsJwt);
    void invalidateClientEntitlementCachesByClientId(clientId);
    return NextResponse.json({ data: updated });
  } catch (error) {
    const upstreamStatus = getCmsErrorStatus(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Client could not be updated",
      },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 },
    );
  }
}
