import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { isAdminRole } from "@/lib/auth/role-model";
import { strapiRequest } from "@/services/hiring-manager-campaigns.service";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const strapiJwt = await getServerStrapiJwt();
  if (!session?.user?.id || !strapiJwt) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (!isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  }

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
