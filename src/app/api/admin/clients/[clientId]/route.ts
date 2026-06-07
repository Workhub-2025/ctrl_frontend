import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { isAdminRole } from "@/lib/auth/role-model";
import {
  deleteAdminClient,
  getAdminClientDetails,
  getStrapiErrorStatus,
} from "@/services/admin-platform.service";

type RouteContext = {
  params: Promise<{ clientId: string }>;
};

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  if (!isAdminRole(session.user.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Administrator access required" }, { status: 403 }),
    };
  }
  return { ok: true as const, session };
}

async function getClientId(context: RouteContext) {
  const params = await context.params;
  return params.clientId;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const client = await getAdminClientDetails(await getClientId(context));
    return NextResponse.json({ data: client });
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Client could not be loaded" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    if (!body?.confirmName || typeof body.confirmName !== "string") {
      return NextResponse.json({ error: "confirmName is required" }, { status: 400 });
    }

    await deleteAdminClient(
      await getClientId(context),
      body.confirmName,
      auth.session.user.jwt
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
