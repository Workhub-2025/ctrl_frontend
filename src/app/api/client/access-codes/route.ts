import { NextResponse } from "next/server";

import { handleBffRouteError } from "@/lib/auth/bff-session";
import {
  defaultInvitationExpiry,
  requireFirebaseTenancySession,
  toClientAccessCodes,
} from "@/lib/firebase-tenancy-bff";
import { rejectMutatingCrossOrigin } from "@/lib/security/bff-mutation-guard";
import { rejectRateLimitedMutation } from "@/lib/security/api-rate-limit";
import { sanitisePlainText } from "@/lib/security/input-sanitization";

function parseSeatNumber(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value !== "string") return undefined;
  const numeric = Number(value.match(/\d+/)?.[0] ?? value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : undefined;
}

function inviteAcceptUrl(request: Request, token: string, email: string) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto =
    request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
  const envBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    "";
  const base =
    forwardedHost && !forwardedHost.includes("localhost")
      ? `${forwardedProto}://${forwardedHost}`
      : envBase || "http://localhost:3000";
  const url = new URL("/auth/accept-invitation", base);
  url.searchParams.set("token", token);
  url.searchParams.set("email", email);
  return url.toString();
}

export async function GET() {
  try {
    const { context, tenancy } = await requireFirebaseTenancySession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }
    const workspace = await tenancy.getClientTeamWorkspace(context.organizationId);
    return NextResponse.json({ data: toClientAccessCodes(workspace) });
  } catch (error) {
    return handleBffRouteError(error, "Access codes could not be loaded");
  }
}

export async function POST(request: Request) {
  try {
    const crossOriginResponse = rejectMutatingCrossOrigin(request);
    if (crossOriginResponse) return crossOriginResponse;

    const { session, context, tenancy } =
      await requireFirebaseTenancySession("client");
    if (!context.organizationId) {
      return NextResponse.json(
        { error: "Organization membership is required" },
        { status: 403 },
      );
    }

    const rateLimited = await rejectRateLimitedMutation(request, {
      scope: "client:access-code:create",
      actorId: session.user.id,
      limit: 20,
    });
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => ({}));
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const seatNumber = parseSeatNumber(body?.seatNumber ?? body?.seatLabel);
    const seatLabel =
      sanitisePlainText(body?.seatLabel, { maxLength: 80 }) || undefined;
    const refreshInvitationId =
      typeof body?.refreshCodeDocumentId === "string"
        ? body.refreshCodeDocumentId
        : undefined;

    const workspace = await tenancy.getClientTeamWorkspace(context.organizationId);

    if (refreshInvitationId) {
      const invitation = workspace.invitations.find(
        (item) => item.id === refreshInvitationId && item.status === "pending",
      );
      if (invitation) {
        await tenancy.revokeInvitation(invitation.id);
      }
    }

    const seat =
      (seatNumber
        ? workspace.seats.find((item) => item.seatNumber === seatNumber)
        : undefined) ??
      workspace.seats.find((item) => item.status === "available");

    if (!seat) {
      return NextResponse.json(
        { error: "No hiring-manager seat is available" },
        { status: 409 },
      );
    }

    if (!email) {
      // Firebase invitations require an email. Surface the stable seat slot so
      // the client UI can invite once an address is provided.
      return NextResponse.json(
        {
          data: {
            documentId: seat.id,
            expiresAt: defaultInvitationExpiry(),
            status: seat.status,
            targetRole: "hiring_manager",
            invitedEmail: null,
            seatNumber: seat.seatNumber,
            seatLabel: seatLabel ?? seat.seatLabel ?? `Seat ${seat.seatNumber}`,
          },
        },
        { status: 201 },
      );
    }

    if (seat.status === "occupied" || seat.status === "reserved") {
      const replaced = await tenancy.replaceSeatOccupant(
        context.organizationId,
        seat.id,
        { email, expiresAt: defaultInvitationExpiry() },
      );
      return NextResponse.json(
        {
          data: {
            documentId: replaced.invitationId,
            expiresAt: defaultInvitationExpiry(),
            status: "reserved",
            targetRole: "hiring_manager",
            invitedEmail: email,
            seatNumber: seat.seatNumber,
            seatLabel: seatLabel ?? seat.seatLabel ?? `Seat ${seat.seatNumber}`,
            inviteAcceptUrl: inviteAcceptUrl(request, replaced.token, email),
          },
        },
        { status: 201 },
      );
    }

    const invitation = await tenancy.createInvitation({
      organizationId: context.organizationId,
      email,
      role: "hiring_manager",
      seatId: seat.id,
      expiresAt: defaultInvitationExpiry(),
    });

    return NextResponse.json(
      {
        data: {
          documentId: invitation.invitationId,
          expiresAt: defaultInvitationExpiry(),
          status: "reserved",
          targetRole: "hiring_manager",
          invitedEmail: email,
          seatNumber: seat.seatNumber,
          seatLabel: seatLabel ?? seat.seatLabel ?? `Seat ${seat.seatNumber}`,
          inviteAcceptUrl: inviteAcceptUrl(request, invitation.token, email),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleBffRouteError(error, "Access codes could not be loaded");
  }
}
