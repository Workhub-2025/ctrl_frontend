import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireAdminApiAccess } from "@/lib/auth/admin-api-auth";
import {
  deleteAdminClient,
  getAdminClientDetails,
  getStrapiErrorStatus,
} from "@/services/admin-platform.service";

type RouteContext = {
  params: Promise<any>;
};

async function getClientId(context: RouteContext) {
  const params = await context.params;
  return params.clientId;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApiAccess('clients.read');
  if ("error" in auth) return auth.error;

  try {
    const client = await getAdminClientDetails(await getClientId(context), auth.strapiJwt);
    return NextResponse.json({ data: client });
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    if (upstreamStatus === 404) {
      return NextResponse.json({ data: null });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Client could not be loaded" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdminApiAccess('clients.read');
  if ("error" in auth) return auth.error;

  try {
    const body = await request.json().catch(() => ({}));
    const confirmName =
      typeof body?.confirmName === "string" ? body.confirmName.trim() : "";
    if (!confirmName) {
      return NextResponse.json({ error: "confirmName is required" }, { status: 400 });
    }

    await deleteAdminClient(
      await getClientId(context),
      confirmName,
      auth.strapiJwt
    );
    return NextResponse.json({ data: { deleted: true } });
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Client could not be deleted" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
    const auth = await requireAdminApiAccess('clients.read');
    if ("error" in auth) return auth.error;

    try {
        const body = await request.json().catch(() => ({}));
        if (!body || typeof body !== "object") {
            return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
        }

        const { updateAdminClient } = await import("@/services/admin-platform.service");
        const updated = await updateAdminClient(
            await getClientId(context),
            body,
            auth.strapiJwt
        );
        return NextResponse.json({ data: updated });
    } catch (error) {
        const upstreamStatus = getStrapiErrorStatus(error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Client could not be updated" },
            { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
        );
    }
}
