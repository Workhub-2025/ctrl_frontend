import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { joinStrapiApiPath, getStrapiApiBaseUrl } from "@/lib/strapi-server";

export async function GET() {
  const auth = await requireAdminApiAccess("admins.manage");
  if ("error" in auth) {
    return auth.error;
  }

  const response = await fetch(joinStrapiApiPath(getStrapiApiBaseUrl(), "/admin/team/roles"), {
    headers: {
      Authorization: `Bearer ${auth.strapiJwt}`,
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { error: (payload as { error?: string }).error ?? "Roles could not be loaded" },
      { status: response.status },
    );
  }

  return NextResponse.json(payload);
}
