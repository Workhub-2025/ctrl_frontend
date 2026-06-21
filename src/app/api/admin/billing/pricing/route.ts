import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

export async function GET() {
  const auth = await requireAdminApiAccess('billing.read');
  if ("error" in auth) {
    return auth.error;
  }
  const strapiJwt = auth.strapiJwt;

  try {
    const response = await strapiRequest<{ data?: Record<string, unknown> }>("/platform-pricing");
    return NextResponse.json({ data: response.data ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pricing could not be loaded" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const auth = await requireAdminApiAccess('billing.write');
  if ("error" in auth) {
    return auth.error;
  }
  const strapiJwt = auth.strapiJwt;

  try {
    const body = await request.json();
    const response = await strapiRequest<{ data?: Record<string, unknown> }>("/admin/platform-pricing", {
      method: "PUT",
      body: JSON.stringify(body),
    });
    return NextResponse.json({ data: response.data ?? null });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pricing could not be saved" },
      { status: 500 }
    );
  }
}
