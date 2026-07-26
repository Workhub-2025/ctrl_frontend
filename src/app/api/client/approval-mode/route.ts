import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import { createFirebaseClientPortalApi } from "@/lib/firebase-client-portal-api";
import { requireFirebaseRecruitmentSession } from "@/lib/firebase-recruitment-bff";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

type ApprovalMode = "auto_approve" | "require_approval";

function resolveApprovalMode(body: Record<string, unknown>): ApprovalMode | null {
  if (body.mode === "auto_approve" || body.mode === "require_approval") {
    return body.mode;
  }

  if (typeof body.autoApprove === "boolean") {
    return body.autoApprove ? "auto_approve" : "require_approval";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { context, domainApi, firebaseSessionCookie } =
      await requireFirebaseRecruitmentSession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const mode = resolveApprovalMode(body as Record<string, unknown>);

    if (!mode) {
      return NextResponse.json(
        { error: "mode must be auto_approve or require_approval" },
        { status: 400 },
      );
    }

    const portal = createFirebaseClientPortalApi(
      domainApi,
      firebaseSessionCookie,
    );
    const organization = await portal.updateApprovalMode(
      context.organizationId,
      mode,
    );
    return NextResponse.json({
      data: {
        documentId: organization.id,
        name: organization.legalName,
        campaignApprovalMode: organization.campaignApprovalMode,
      },
    });
  } catch (error) {
    return handleBffRouteError(error, "Approval mode could not be updated");
  }
}
