import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import {
  generateAdminClientAccessCode,
  getStrapiErrorStatus,
} from "@/services/admin-platform.service";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminApiAccess('clients.write');
    if ("error" in auth) {
      return auth.error;
    }
    const strapiJwt = auth.strapiJwt;
    const body = await request.json().catch(() => ({}));
    if (!body?.clientDocumentId || typeof body.clientDocumentId !== "string") {
      return NextResponse.json({ error: "clientDocumentId is required" }, { status: 400 });
    }

    const result = await generateAdminClientAccessCode(
      body.clientDocumentId,
      strapiJwt
    );

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Client access code could not be generated",
      },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}
