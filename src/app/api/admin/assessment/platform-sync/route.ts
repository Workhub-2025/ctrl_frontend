import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { invalidateAssessmentCatalogueCache } from "@/lib/portal-cache-keys";
import { getStrapiApiBaseUrl, joinStrapiApiPath } from "@/lib/strapi-server";

export async function POST() {
  const auth = await requireAdminApiAccess("recovery.write");
  if ("error" in auth) {
    return auth.error;
  }

  try {
    const response = await fetch(
      joinStrapiApiPath(getStrapiApiBaseUrl(), "/assessment/platform/sync"),
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.strapiJwt}`,
        },
      },
    );

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        body?.error?.message ||
        body?.error ||
        "Platform catalogue sync failed";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    await invalidateAssessmentCatalogueCache();

    return NextResponse.json({ data: body?.data ?? null });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Platform catalogue sync failed",
      },
      { status: 500 },
    );
  }
}
