import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import {
  toAdminClientCreateResult,
  type FirebaseClientTeamWorkspace,
} from "@/lib/firebase-admin-tenancy-bff";
import {
  createAdminClient,
  getCmsErrorStatus,
  type AdminClientCreateInput,
} from "@/services/admin-platform.service";

function validatePayload(body: unknown):
  | { valid: true; data: AdminClientCreateInput }
  | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const value = body as Partial<AdminClientCreateInput>;
  const seatCount = Number(value.contract?.seatCount);
  const assessmentDataRetentionMonths = Number(
    value.contract?.assessmentDataRetentionMonths,
  );
  const tier = value.contract?.tier ?? "professional";

  if (!value.name?.trim()) return { valid: false, error: "Client name is required" };
  if (
    value.primaryContactEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.primaryContactEmail)
  ) {
    return { valid: false, error: "Primary contact email is invalid" };
  }
  const campaignApprovalMode = value.campaignApprovalMode;
  if (!["auto_approve", "require_approval"].includes(campaignApprovalMode ?? "")) {
    return { valid: false, error: "Campaign approval mode is invalid" };
  }
  if (!["essential", "professional", "founder"].includes(tier)) {
    return { valid: false, error: "Contract tier is invalid" };
  }
  if (!Number.isInteger(seatCount) || seatCount < 1) {
    return { valid: false, error: "Hiring manager seats must be at least 1" };
  }
  if (
    !Number.isInteger(assessmentDataRetentionMonths) ||
    assessmentDataRetentionMonths < 1 ||
    assessmentDataRetentionMonths > 120
  ) {
    return {
      valid: false,
      error: "Assessment retention must be between 1 and 120 months",
    };
  }

  return {
    valid: true,
    data: {
      name: value.name.trim(),
      legalName: value.legalName?.trim() || undefined,
      primaryContactName: value.primaryContactName?.trim() || undefined,
      primaryContactEmail:
        value.primaryContactEmail?.trim().toLowerCase() || undefined,
      primaryContactPhone: value.primaryContactPhone?.trim() || undefined,
      officeAddress: value.officeAddress?.trim() || undefined,
      city: value.city?.trim() || undefined,
      state: value.state?.trim() || undefined,
      zipCode: value.zipCode?.trim() || undefined,
      timeZone: value.timeZone?.trim() || undefined,
      campaignApprovalMode: campaignApprovalMode as
        | "auto_approve"
        | "require_approval",
      contract: {
        tier: tier as AdminClientCreateInput["contract"]["tier"],
        seatCount,
        assessmentDataRetentionMonths,
        notes: value.contract?.notes?.trim() || undefined,
      },
      issueAccessCode: Boolean(value.issueAccessCode),
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminDualAccess("clients.write");
    if ("error" in auth) return auth.error;

    const validation = validatePayload(await request.json().catch(() => null));
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    if (isFirebaseAdminAuth(auth)) {
      const created = await auth.domainApi.request<{
        organizationId: string;
        seatIds: string[];
      }>({
        path: "/v1/organizations",
        method: "POST",
        firebaseSessionCookie: auth.firebaseSessionCookie,
        body: {
          legalName: validation.data.legalName || validation.data.name,
          seatCount: validation.data.contract.seatCount,
          campaignApprovalMode: validation.data.campaignApprovalMode,
          tier: validation.data.contract.tier,
        },
      });

      if (validation.data.primaryContactEmail) {
        const expiresAt = new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString();
        await auth.domainApi.request({
          path: "/v1/invitations",
          method: "POST",
          firebaseSessionCookie: auth.firebaseSessionCookie,
          body: {
            organizationId: created.organizationId,
            email: validation.data.primaryContactEmail,
            role: "client_owner",
            expiresAt,
          },
        });
      }

      const workspace = await auth.domainApi.request<FirebaseClientTeamWorkspace>({
        path: `/v1/organizations/${encodeURIComponent(created.organizationId)}/workspace`,
        firebaseSessionCookie: auth.firebaseSessionCookie,
      });

      return NextResponse.json(
        {
          data: toAdminClientCreateResult(created.organizationId, workspace),
        },
        { status: 201 },
      );
    }

    const created = await createAdminClient(validation.data, auth.cmsJwt);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const upstreamStatus = getCmsErrorStatus(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Client could not be created",
      },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 },
    );
  }
}
