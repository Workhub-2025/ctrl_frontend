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
    const message =
      (payload as { error?: { message?: string } }).error?.message
      ?? (typeof (payload as { error?: unknown }).error === "string"
        ? (payload as { error: string }).error
        : null)
      ?? "Roles could not be loaded";
    return NextResponse.json({ error: message }, { status: response.status });
  }

  return NextResponse.json(payload);
}
