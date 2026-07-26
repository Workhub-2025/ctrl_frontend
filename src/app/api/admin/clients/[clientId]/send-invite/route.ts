import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import {
  getCmsErrorStatus,
  sendAdminClientInvite,
} from "@/services/admin-platform.service";

type RouteContext = {
  params: Promise<{ clientId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdminDualAccess("clients.write");
    if ("error" in auth) return auth.error;

    const { clientId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "A valid email address is required" },
        { status: 400 },
      );
    }

    if (isFirebaseAdminAuth(auth)) {
      const expiresAt = new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      ).toISOString();
      const result = await auth.domainApi.request<{
        invitationId: string;
        token: string;
        seatId: string | null;
      }>({
        path: "/v1/invitations",
        method: "POST",
        firebaseSessionCookie: auth.firebaseSessionCookie,
        body: {
          organizationId: clientId,
          email,
          role: "client_owner",
          expiresAt,
        },
      });
      return NextResponse.json(
        {
          data: {
            invitationId: result.invitationId,
            email,
            expiresAt,
            status: "pending",
          },
        },
        { status: 201 },
      );
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
      auth.cmsJwt,
    );

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const upstreamStatus = getCmsErrorStatus(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Client invite could not be sent",
      },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 },
    );
  }
}
