import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const auth = await requireAdminApiAccess('billing.write');
  if ("error" in auth) {
    return auth.error;
  }
  const strapiJwt = auth.strapiJwt;

  const { requestId } = await params;

  try {
    const response = await strapiRequest<{ data?: Record<string, unknown> }>(
      `/admin/billing/requests/${encodeURIComponent(requestId)}/process-seat-decrease`,
      { method: "POST" }
    );

    return NextResponse.json({ data: response.data ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Seat reduction could not be processed" },
      { status: 500 }
    );
  }
}
