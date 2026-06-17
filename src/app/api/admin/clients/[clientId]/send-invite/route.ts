import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { getServerStrapiJwt } from "@/lib/auth/strapi-jwt";
import { isAdminRole } from "@/lib/auth/role-model";
import {
  getStrapiErrorStatus,
  sendAdminClientInvite,
} from "@/services/admin-platform.service";

type RouteContext = {
  params: Promise<{ clientId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }

    const { clientId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    const strapiJwt = await getServerStrapiJwt(request);
    if (!strapiJwt) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const result = await sendAdminClientInvite(
      clientId,
      {
        email,
        accessCodeDocumentId:
          typeof body?.accessCodeDocumentId === "string"
            ? body.accessCodeDocumentId
            : undefined,
      },
      strapiJwt
    );

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const upstreamStatus = getStrapiErrorStatus(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Client invite could not be sent",
      },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}
