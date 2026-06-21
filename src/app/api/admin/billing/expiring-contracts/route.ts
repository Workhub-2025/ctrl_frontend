import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

export async function GET(request: Request) {
  const auth = await requireAdminApiAccess('billing.read');
  if ("error" in auth) {
    return auth.error;
  }
  const strapiJwt = auth.strapiJwt;

  const { searchParams } = new URL(request.url);
  const withinDays = Number(searchParams.get("withinDays") ?? 90);

  try {
    const response = await strapiRequest<{ data?: unknown[] }>(
      `/admin/billing/expiring-contracts?withinDays=${encodeURIComponent(String(withinDays))}`
    );
    return NextResponse.json({ data: response.data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Expiring contracts could not be loaded" },
      { status: 500 }
    );
  }
}
