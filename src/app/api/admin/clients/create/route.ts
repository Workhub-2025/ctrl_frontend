import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { isAdminRole } from "@/lib/auth/role-model";
import {
  createAdminClient,
  getStrapiErrorStatus,
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
  if (!value.contract?.startDate) return { valid: false, error: "Contract start date is required" };
  if (!value.contract?.endDate) return { valid: false, error: "Contract end date is required" };
  if (!Number.isInteger(seatCount) || seatCount < 1) {
    return { valid: false, error: "Hiring manager seats must be at least 1" };
  }
  if (new Date(value.contract.endDate).getTime() <= new Date(value.contract.startDate).getTime()) {
    return { valid: false, error: "Contract end date must be after the start date" };
  }

  return {
    valid: true,
    data: {
      name: value.name.trim(),
      legalName: value.legalName?.trim() || undefined,
      primaryContactName: value.primaryContactName?.trim() || undefined,
      primaryContactEmail: value.primaryContactEmail?.trim().toLowerCase() || undefined,
      primaryContactPhone: value.primaryContactPhone?.trim() || undefined,
      officeAddress: value.officeAddress?.trim() || undefined,
      city: value.city?.trim() || undefined,
      state: value.state?.trim() || undefined,
      zipCode: value.zipCode?.trim() || undefined,
      timeZone: value.timeZone?.trim() || undefined,
      campaignApprovalMode: campaignApprovalMode as "auto_approve" | "require_approval",
      contract: {
        startDate: value.contract.startDate,
        endDate: value.contract.endDate,
        seatCount,
        notes: value.contract.notes?.trim() || undefined,
      },
      issueAccessCode: Boolean(value.issueAccessCode),
    },
  };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }

    const validation = validatePayload(await request.json().catch(() => null));
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const created = await createAdminClient(validation.data);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Client could not be created",
      },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}
