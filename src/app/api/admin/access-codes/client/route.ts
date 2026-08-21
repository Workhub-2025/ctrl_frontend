import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminDualAccess } from "@/lib/auth/admin-dual-access";
import { handleBffRouteError } from "@/lib/auth/bff-route-errors";
import { invitationAcceptUrl } from "@/lib/public-app-urls";

const INVITE_TTL_MS = 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminDualAccess("clients.write");
    if ("error" in auth) {
      return auth.error;
    }

    const body = await request.json().catch(() => ({}));
    if (!body?.clientDocumentId || typeof body.clientDocumentId !== "string") {
      return NextResponse.json({ error: "clientDocumentId is required" }, { status: 400 });
    }

    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          error:
            "A client contact email is required. Onboarding uses email invitations — send an invite from the client page.",
        },
        { status: 400 },
      );
    }

    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
    const invitation = await auth.domainApi.request<{
      invitationId: string;
      token: string;
      seatId: string | null;
    }>({
      path: "/v1/invitations",
      method: "POST",
      firebaseSessionCookie: auth.firebaseSessionCookie,
      body: {
        organizationId: body.clientDocumentId,
        email,
        role: "client_owner",
        expiresAt,
      },
    });

    const inviteAcceptUrl = invitationAcceptUrl(
      request,
      invitation.token,
      email,
    );

    return NextResponse.json(
      {
        data: {
          documentId: invitation.invitationId,
          code: inviteAcceptUrl,
          inviteAcceptUrl,
          expiresAt,
          status: "pending",
          targetRole: "client",
          invitedEmail: email,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleBffRouteError(error, "Client access code could not be generated");
  }
}
