import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { isAdminRole } from "@/lib/auth/role-model";
import {
  getAdminClientEntitlements,
  getStrapiErrorStatus,
  updateAdminClient,
} from "@/services/admin-platform.service";

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

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const clients = await getAdminClientEntitlements();
    return NextResponse.json({ data: clients });
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Entitlements could not be loaded" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const clientDocumentId =
      typeof body?.clientDocumentId === "string" ? body.clientDocumentId : "";

    if (!clientDocumentId) {
      return NextResponse.json({ error: "clientDocumentId is required" }, { status: 400 });
    }

    const seatCount =
      body?.contract && "seatCount" in body.contract
        ? Number(body.contract.seatCount)
        : undefined;

    if (seatCount !== undefined && (!Number.isInteger(seatCount) || seatCount < 1)) {
      return NextResponse.json({ error: "seatCount must be at least 1" }, { status: 400 });
    }

    const updated = await updateAdminClient(
      clientDocumentId,
      {
        features:
          body?.features && typeof body.features === "object"
            ? body.features
            : undefined,
        contract:
          seatCount !== undefined
            ? {
                seatCount,
                notes:
                  typeof body?.contract?.notes === "string"
                    ? body.contract.notes
                    : undefined,
              }
            : undefined,
      },
      auth.session.user.jwt
    );

    return NextResponse.json({ data: updated });
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Entitlements could not be updated" },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}
