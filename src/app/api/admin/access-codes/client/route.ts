import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isFirebaseAdminAuth,
  requireAdminDualAccess,
} from "@/lib/auth/admin-dual-access";
import {
  generateAdminClientAccessCode,
  getCmsErrorStatus,
} from "@/services/admin-platform.service";
import { invitationAcceptUrl } from "@/lib/public-app-urls";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

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

    // Firebase model: org-wide client access codes were replaced by email-scoped
    // client_owner invitations. Create the invitation and return its accept link
    // so the admin action still yields a usable onboarding artifact.
    if (isFirebaseAdminAuth(auth)) {
      const email =
        typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          {
            error:
              "A client contact email is required. Firebase onboarding uses email invitations — send an invite from the client page.",
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
            // The shareable artifact under the invitation model is the accept
            // link, surfaced through the existing `code` field so callers that
            // display it keep working (and can copy it).
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
    }

    const result = await generateAdminClientAccessCode(
      body.clientDocumentId,
      auth.cmsJwt,
    );

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const upstreamStatus = getCmsErrorStatus(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Client access code could not be generated",
      },
      { status: upstreamStatus && upstreamStatus >= 400 ? upstreamStatus : 500 }
    );
  }
}
