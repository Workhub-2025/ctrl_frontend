import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { joinStrapiApiPath, getStrapiApiBaseUrl } from "@/lib/strapi-server";

export async function POST(request: Request) {
  const auth = await requireAdminApiAccess("admins.manage");
  if ("error" in auth) {
    return auth.error;
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const response = await fetch(joinStrapiApiPath(getStrapiApiBaseUrl(), "/admin/team/members"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.strapiJwt}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          (payload as { error?: { message?: string } }).error?.message
          ?? (payload as { error?: string }).error
          ?? "Admin user could not be created",
      },
      { status: response.status },
    );
  }

  return NextResponse.json(payload, { status: 201 });
}
