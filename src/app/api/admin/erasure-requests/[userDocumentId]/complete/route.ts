import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import { getStrapiClient } from "@/lib/strapi";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";

type RouteContext = { params: Promise<{ userDocumentId: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const auth = await requireAdminApiAccess("users.write");
    if ("error" in auth) {
      return auth.error;
    }

    const { userDocumentId } = await context.params;
    const client = getStrapiClient(auth.strapiJwt);
    const response = await client.fetch(
      `/admin/erasure-requests/${encodeURIComponent(userDocumentId)}/complete`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
    );
    const body = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: body?.error?.message ?? "Erasure could not be completed" },
        { status: response.status }
      );
    }

    return NextResponse.json(body);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Erasure could not be completed",
      },
      { status: 500 }
    );
  }
}
