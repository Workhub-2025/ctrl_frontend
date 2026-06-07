import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/next-auth-options";
import { isAdminRole } from "@/lib/auth/role-model";
import {
  generateAdminClientAccessCode,
  getStrapiErrorStatus,
} from "@/services/admin-platform.service";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    if (!body?.clientDocumentId || typeof body.clientDocumentId !== "string") {
      return NextResponse.json({ error: "clientDocumentId is required" }, { status: 400 });
    }

    const result = await generateAdminClientAccessCode(
      body.clientDocumentId,
      session.user.jwt
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
