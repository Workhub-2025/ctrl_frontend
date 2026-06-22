import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { getStrapiClient } from "@/lib/strapi";

export async function GET() {
  try {
    const auth = await requireAdminApiAccess("users.read");
    if ("error" in auth) {
      return auth.error;
    }

    const client = getStrapiClient(auth.strapiJwt);
    const response = await client.fetch("/admin/erasure-requests");
    const body = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: body?.error?.message ?? "Erasure queue could not be loaded" },
        { status: response.status }
      );
    }

    return NextResponse.json(body);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Erasure queue could not be loaded",
      },
      { status: 500 }
    );
  }
}
